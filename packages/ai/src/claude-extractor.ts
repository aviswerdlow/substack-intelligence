import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { ExtractionResultSchema, hashContent } from '@substack-intelligence/shared';

export class ClaudeExtractor {
  private client: Anthropic;
  private ratelimit: Ratelimit | null = null;
  private cache: Redis | null = null;
  
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });
    
    // Initialize rate limiting if Redis is available
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.cache = Redis.fromEnv();
      this.ratelimit = new Ratelimit({
        redis: this.cache,
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        analytics: true
      });
    }
  }

  async extractCompanies(content: string, newsletterName: string) {
    const startTime = Date.now();
    
    // Check rate limits if available
    if (this.ratelimit) {
      const { success } = await this.ratelimit.limit('claude-extraction');
      if (!success) {
        throw new Error('Rate limit exceeded');
      }
    }
    
    // Check cache if available
    const cacheKey = `extraction:${hashContent(content)}`;
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return ExtractionResultSchema.parse(cached);
      }
    }
    
    try {
      // Make the API call to Claude
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.2,
        system: this.getSystemPrompt(),
        messages: [{
          role: 'user',
          content: `
            Newsletter: ${newsletterName}
            Content: ${content.slice(0, 8000)} ${content.length > 8000 ? '...[truncated]' : ''}
            
            Extract all company mentions following the schema provided.
            Focus on: consumer brands, startups, venture-backed companies.
            Exclude: public companies unless they're launching new ventures.
          `
        }]
      });
      
      // Parse the response
      const responseText = response.content[0]?.text;
      if (!responseText) {
        throw new Error('No response from Claude');
      }
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Failed to parse Claude response as JSON');
        }
      }
      
      // Add processing metadata
      const result = {
        ...parsedResponse,
        metadata: {
          ...parsedResponse.metadata,
          processingTime: Date.now() - startTime,
          tokenCount: response.usage?.input_tokens || 0,
          modelVersion: 'claude-3-5-sonnet-20241022'
        }
      };
      
      // Validate the result
      const validatedResult = ExtractionResultSchema.parse(result);
      
      // Cache the result for 7 days if cache is available
      if (this.cache) {
        await this.cache.set(cacheKey, validatedResult, { ex: 604800 });
      }
      
      return validatedResult;
      
    } catch (error) {
      console.error('Claude extraction failed:', error);
      
      // Return empty result with error metadata
      return {
        companies: [],
        metadata: {
          processingTime: Date.now() - startTime,
          tokenCount: 0,
          modelVersion: 'claude-3-5-sonnet-20241022',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert venture capital analyst specializing in consumer brands and startups.

Your task is to extract company mentions from newsletter content with high precision and accuracy.

CRITICAL: You must return ONLY a valid JSON object matching this exact schema:

{
  "companies": [
    {
      "name": "Company Name",
      "description": "Brief description of what the company does",
      "context": "The exact sentence or paragraph where the company was mentioned",
      "sentiment": "positive|negative|neutral",
      "confidence": 0.85
    }
  ],
  "metadata": {
    "processingTime": 0,
    "tokenCount": 0,
    "modelVersion": "claude-3-5-sonnet-20241022"
  }
}

EXTRACTION GUIDELINES:

1. INCLUDE these types of companies:
   - Private companies and startups
   - Consumer brands (beauty, fashion, food, beverage, lifestyle)
   - New ventures from established companies
   - Spin-offs and subsidiaries launching new products
   - Companies mentioned in funding or acquisition context

2. EXCLUDE these:
   - Large public companies (unless launching new ventures)
   - Personal brands of individuals (unless incorporated businesses)
   - Generic product categories or industries
   - Investment firms or VCs themselves
   - Media companies or publications

3. SENTIMENT ANALYSIS:
   - "positive": Company is praised, recommended, or mentioned favorably
   - "negative": Company is criticized or mentioned unfavorably  
   - "neutral": Factual mention without clear positive/negative tone

4. CONFIDENCE SCORING (0.0 to 1.0):
   - 0.9-1.0: Very clear company mention with specific details
   - 0.7-0.8: Clear mention but some ambiguity
   - 0.5-0.6: Unclear or indirect mention
   - Below 0.5: Very uncertain, consider excluding

5. CONTEXT REQUIREMENTS:
   - Include the full sentence containing the company mention
   - Add surrounding context if it clarifies the mention
   - Maximum 200 characters per context

6. COMPANY NAME:
   - Use the exact name as mentioned in the text
   - If multiple variations appear, use the most complete version

Remember: Be conservative with extractions. When in doubt, include with lower confidence rather than exclude entirely. Focus on precision over recall.

Return ONLY the JSON object, no additional text or formatting.`;
  }

  // Batch extraction for multiple pieces of content
  async batchExtract(
    contents: Array<{ content: string; newsletterName: string; id?: string }>
  ) {
    const results = await Promise.allSettled(
      contents.map(({ content, newsletterName, id }) =>
        this.extractCompanies(content, newsletterName).then(result => ({
          id,
          newsletterName,
          ...result
        }))
      )
    );

    const successful = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);

    const failed = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason);

    if (failed.length > 0) {
      console.warn(`${failed.length} extractions failed:`, failed);
    }

    return {
      successful,
      failed: failed.length,
      total: contents.length
    };
  }

  // Get extraction statistics
  async getStats() {
    if (!this.cache) {
      return null;
    }

    try {
      const keys = await this.cache.keys('extraction:*');
      return {
        cachedExtractions: keys.length,
        cacheHitRate: 'N/A' // Would need separate tracking
      };
    } catch (error) {
      console.warn('Failed to get extraction stats:', error);
      return null;
    }
  }
}