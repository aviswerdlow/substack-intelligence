import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { ExtractionResultSchema, hashContent } from '@substack-intelligence/shared';

const REDIS_PLACEHOLDER_MARKERS = ['your-redis', 'example', 'localhost', 'changeme'];

export class ClaudeExtractor {
  private client!: Anthropic;
  private ratelimit: Ratelimit | null = null;
  private cache: Redis | null = null;
  private maxRetries: number = 5; // Increased for better rate limit handling
  private baseDelay: number = 2000; // 2 second base delay for rate limits
  private requestTimeoutMs: number = Math.max(5000, Number(process.env.CLAUDE_REQUEST_TIMEOUT_MS) || 12000);
  private rateLimitDisabled: boolean = false;
  private cacheDisabled: boolean = false;
  private isInitialized: boolean = false;
  
  constructor(client?: Anthropic) {
    try {
      if (client) {
        // Use provided client (for testing)
        this.client = client;
        this.isInitialized = true;
        console.log('[ClaudeExtractor] ✅ Initialized with provided client (test mode)');
      } else {
        // Create new client (for production)
        this.initializeProductionClient();
      }
      
      // Initialize optional services
      this.initializeOptionalServices();
      
    } catch (error) {
      console.error('[ClaudeExtractor] ❌ Constructor failed:', error);
      throw new Error(`ClaudeExtractor initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private normalizeClaudeError(error: any): any {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(`Claude request timed out after ${this.requestTimeoutMs}ms`);
      timeoutError.name = 'ClaudeTimeoutError';
      return timeoutError;
    }

    return error;
  }

  private shouldEnableRedis(redisUrl?: string | null, redisToken?: string | null): boolean {
    if (!redisUrl || !redisToken) {
      return false;
    }

    const normalizedUrl = redisUrl.trim().toLowerCase();
    const normalizedToken = redisToken.trim().toLowerCase();

    return !REDIS_PLACEHOLDER_MARKERS.some(marker =>
      normalizedUrl.includes(marker) || normalizedToken.includes(marker)
    );
  }

  private disableRateLimiting(error?: unknown) {
    if (!this.rateLimitDisabled && error) {
      console.warn('[ClaudeExtractor] ⚠️ Disabling rate limiting after error:', error instanceof Error ? error.message : error);
    } else if (!this.rateLimitDisabled) {
      console.warn('[ClaudeExtractor] ⚠️ Disabling rate limiting');
    }
    this.ratelimit = null;
    this.rateLimitDisabled = true;
  }

  private disableCache(error?: unknown) {
    if (!this.cacheDisabled && error) {
      console.warn('[ClaudeExtractor] ⚠️ Disabling Redis cache after error:', error instanceof Error ? error.message : error);
    } else if (!this.cacheDisabled) {
      console.warn('[ClaudeExtractor] ⚠️ Disabling Redis cache');
    }
    this.cache = null;
    this.cacheDisabled = true;
  }

  private initializeProductionClient() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    // Enhanced API key validation
    if (!apiKey) {
      console.error('[ClaudeExtractor] ❌ ANTHROPIC_API_KEY not found in environment');
      throw new Error('ANTHROPIC_API_KEY is required but not configured');
    }
    
    // Validate API key format
    if (!apiKey.startsWith('sk-ant-')) {
      console.error('[ClaudeExtractor] ❌ Invalid ANTHROPIC_API_KEY format');
      throw new Error('ANTHROPIC_API_KEY must start with sk-ant-');
    }
    
    try {
      // Initialize Anthropic client with proper configuration
      this.client = new Anthropic({
        apiKey,
        maxRetries: 0, // We handle retries ourselves
        timeout: 30000, // 30 second timeout
      });
      
      this.isInitialized = true;
      console.log('[ClaudeExtractor] ✅ Production client initialized successfully');
      
    } catch (error) {
      console.error('[ClaudeExtractor] ❌ Failed to initialize Anthropic client:', error);
      throw new Error(`Anthropic client initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private initializeOptionalServices() {
    // Initialize Redis cache and rate limiting if available
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    this.rateLimitDisabled = false;
    this.cacheDisabled = false;

    if (!this.shouldEnableRedis(redisUrl, redisToken)) {
      if (redisUrl || redisToken) {
        console.warn('[ClaudeExtractor] ⚠️ Skipping Redis setup due to placeholder configuration');
      } else {
        console.log('[ClaudeExtractor] ℹ️ Redis not configured - rate limiting disabled');
      }
      this.cache = null;
      this.ratelimit = null;
      return;
    }

    try {
      this.cache = Redis.fromEnv();
      this.ratelimit = new Ratelimit({
        redis: this.cache,
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        analytics: true
      });
      console.log('[ClaudeExtractor] ✅ Redis cache and rate limiting initialized');
    } catch (error) {
      console.warn('[ClaudeExtractor] ⚠️ Rate limiting initialization failed:', error instanceof Error ? error.message : error);
      this.cache = null;
      this.ratelimit = null;
      this.cacheDisabled = true;
      this.rateLimitDisabled = true;
    }
  }

  async extractCompanies(content: string, newsletterName: string) {
    const startTime = Date.now();
    
    // Validate inputs
    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }
    
    if (!newsletterName || newsletterName.trim().length === 0) {
      throw new Error('Newsletter name cannot be empty');
    }
    
    // Check if extractor is properly initialized
    if (!this.isInitialized) {
      throw new Error('ClaudeExtractor not properly initialized');
    }
    
    console.log(`[ClaudeExtractor] 🎯 Starting extraction for newsletter: ${newsletterName}`);
    console.log(`[ClaudeExtractor] 📝 Content length: ${content.length} characters`);
    
    // Rate limit check if available
    if (this.ratelimit) {
      try {
        const { success } = await this.ratelimit.limit('claude-extraction');
        if (!success) {
          console.error('[ClaudeExtractor] ❌ Rate limit exceeded');
          throw new Error('Rate limit exceeded - please try again later');
        }
        console.log('[ClaudeExtractor] ✅ Rate limit check passed');
      } catch (error) {
        console.warn('[ClaudeExtractor] ⚠️ Rate limit check failed:', error);
        this.disableRateLimiting(error);
        // Continue without rate limiting if rate limit service fails
      }
    }
    
    // Cache check if available
    const cacheKey = `extraction:${hashContent(content)}`;
    if (this.cache) {
      try {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          console.log('[ClaudeExtractor] ✅ Cache hit - returning cached result');
          return ExtractionResultSchema.parse(cached);
        }
      } catch (error) {
        console.warn('[ClaudeExtractor] ⚠️ Cache read failed:', error);
        this.disableCache(error);
        // Continue without cache if cache service fails
      }
    }
    
    try {
      console.log('[ClaudeExtractor] 🚀 Making API call to Claude...');
      console.log('[ClaudeExtractor] 📊 Request details:', {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.2,
        content_preview: content.slice(0, 100) + '...',
        content_truncated: content.length > 8000
      });
      
      // Make the API call to Claude with retry logic
      let response;
      let lastError: any;
      
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => {
          controller.abort();
        }, this.requestTimeoutMs);

        try {
          console.log(`[ClaudeExtractor] 🔄 Attempt ${attempt}/${this.maxRetries}`);
          
          response = await this.client.messages.create({
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
          }, { signal: controller.signal });
          
          console.log('[ClaudeExtractor] ✅ API call successful');
          console.log('[ClaudeExtractor] 📊 Response usage:', response.usage);
          break; // Success, exit retry loop
          
        } catch (apiError: any) {
          const normalizedError = this.normalizeClaudeError(apiError);
          lastError = normalizedError;
          console.error(`[ClaudeExtractor] ❌ Attempt ${attempt} failed:`, {
            error: normalizedError,
            message: normalizedError?.message,
            status: normalizedError?.status,
            type: normalizedError?.type
          });
          
          // Check if error is retryable
          const isRetryable = this.isRetryableError(normalizedError);

          if (!isRetryable) {
            console.error('[ClaudeExtractor] 🛑 Non-retryable error, stopping attempts');
            throw normalizedError;
          }

          if (attempt < this.maxRetries) {
            // Special handling for rate limit errors
            let delay = this.calculateBackoffDelay(attempt);

            if (normalizedError?.status === 429) {
              // For rate limits, wait longer (minimum 10 seconds, up to 60 seconds)
              const rateDelay = Math.max(10000, delay * 2);
              delay = Math.min(rateDelay, 60000);
              console.log(`[ClaudeExtractor] ⏳ Rate limit hit - waiting ${delay}ms before retry...`);
            } else {
              console.log(`[ClaudeExtractor] ⏰ Waiting ${delay}ms before retry...`);
            }

            await this.sleep(delay);
          } else {
            console.error('[ClaudeExtractor] 💔 All retry attempts exhausted');
            throw normalizedError;
          }
        } finally {
          clearTimeout(timeoutHandle);
        }
      }
      
      if (!response) {
        throw lastError || new Error('Failed to get response after retries');
      }
      
      // Parse the response
      const responseText = (response.content[0] as any)?.text;
      if (!responseText) {
        console.error('[ClaudeExtractor] ❌ Empty response from Claude');
        console.error('[ClaudeExtractor] Full response object:', JSON.stringify(response, null, 2));
        throw new Error('No response from Claude');
      }
      
      console.log('[ClaudeExtractor] 📝 Response text length:', responseText.length);
      console.log('[ClaudeExtractor] Response preview:', responseText.slice(0, 200) + '...');
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
        console.log('[ClaudeExtractor] ✅ Successfully parsed JSON response');
      } catch (parseError) {
        console.warn('[ClaudeExtractor] ⚠️ Direct JSON parsing failed, trying to extract from markdown...');
        // Try to extract JSON from markdown code blocks
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            parsedResponse = JSON.parse(jsonMatch[1]);
            console.log('[ClaudeExtractor] ✅ Successfully extracted and parsed JSON from markdown');
          } catch (innerParseError) {
            console.error('[ClaudeExtractor] ❌ Failed to parse extracted JSON:', innerParseError);
            console.error('[ClaudeExtractor] Extracted text:', jsonMatch[1]);
            throw new Error('Failed to parse Claude response as JSON');
          }
        } else {
          console.error('[ClaudeExtractor] ❌ No JSON found in response');
          console.error('[ClaudeExtractor] Full response text:', responseText);
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
      let validatedResult;
      try {
        validatedResult = ExtractionResultSchema.parse(result);
        console.log('[ClaudeExtractor] ✅ Result validation successful');
        console.log('[ClaudeExtractor] 📊 Extracted companies:', validatedResult.companies.length);
      } catch (validationError) {
        console.error('[ClaudeExtractor] ❌ Result validation failed:', validationError);
        console.error('[ClaudeExtractor] Invalid result:', JSON.stringify(result, null, 2));
        throw validationError;
      }
      
      // Cache the result if caching is available
      if (this.cache) {
        try {
          await this.cache.set(cacheKey, validatedResult, { ex: 604800 }); // Cache for 7 days
          console.log('[ClaudeExtractor] ✅ Result cached successfully');
        } catch (cacheError) {
          console.warn('[ClaudeExtractor] ⚠️ Cache write failed:', cacheError);
          this.disableCache(cacheError);
          // Continue without caching - this is not a critical failure
        }
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`[ClaudeExtractor] ✅ Extraction completed in ${processingTime}ms`);
      console.log(`[ClaudeExtractor] 📊 Companies found: ${validatedResult.companies.map(c => c.name).join(', ')}`);
      
      return validatedResult;
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`[ClaudeExtractor] ❌ Extraction failed after ${processingTime}ms`);
      console.error('[ClaudeExtractor] Error details:', {
        message: error?.message,
        type: error?.constructor?.name,
        status: error?.status,
        code: error?.code,
        stack: error?.stack
      });
      
      // Log specific error context
      if (error?.message?.includes('fetch')) {
        console.error('[ClaudeExtractor] 🌐 This appears to be a network/fetch error');
        console.error('[ClaudeExtractor] Possible causes:');
        console.error('  - Node.js runtime not properly configured');
        console.error('  - Network connectivity issues');
        console.error('  - Anthropic API endpoint unreachable');
      } else if (error?.status === 401) {
        console.error('[ClaudeExtractor] 🔐 Authentication failed - check ANTHROPIC_API_KEY');
      } else if (error?.status === 429) {
        console.error('[ClaudeExtractor] ⏳ Rate limit exceeded - try again later');
      }
      
      // Disable fallback extraction for now - it's extracting garbage
      // console.log('[ClaudeExtractor] 🔄 Attempting fallback extraction method...');
      // try {
      //   const fallbackResult = await this.fallbackExtraction(content, newsletterName);
      //   console.log(`[ClaudeExtractor] ✅ Fallback extraction found ${fallbackResult.companies.length} companies`);
      //   return fallbackResult;
      // } catch (fallbackError) {
      //   console.error('[ClaudeExtractor] ❌ Fallback extraction also failed:', fallbackError);
      // }
      
      // Return empty result with detailed error metadata
      return {
        companies: [],
        metadata: {
          processingTime,
          tokenCount: 0,
          modelVersion: 'claude-3-5-sonnet-20241022',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error?.constructor?.name || 'UnknownError',
          errorStatus: error?.status || null,
          fallbackUsed: false
        }
      };
    }
  }

  public getSystemPrompt(): string {
    return `You are an expert at identifying REAL COMPANY NAMES in text.

CRITICAL: A company must be a NAMED BUSINESS ENTITY, not a phrase or sentence fragment.

VALIDATION RULES - A company name must:
1. Be a proper noun (specific name, not generic description)
2. Refer to an actual business, brand, or organization
3. NOT contain verbs or action words (e.g., "invested", "has been", "scrambling")
4. NOT be a sentence fragment or partial phrase
5. NOT be just a person's name unless it's clearly a company (e.g., "Trump Organization" is OK, just "Trump" is NOT)

✅ VALID COMPANY NAMES:
- "Apple" - technology company
- "The New York Times" - media company  
- "Vevo" - music video platform
- "Create Music Group" - music company
- "Substack" - newsletter platform
- "Tesla" - car manufacturer
- "OpenAI" - AI company

❌ INVALID - NOT COMPANIES:
- "Trump" - just a person's name, not a company
- "America has been scrambling" - sentence fragment with verb
- "Softbank invested" - contains verb "invested"
- "and the Department of Health" - starts with "and", fragment
- "READ IN" - not a known company, likely extracted text
- "Loomer" - just a person's name

You must return ONLY a valid JSON object with this exact structure:

{
  "companies": [
    {
      "name": "Actual Company Name Here",
      "description": "What this company does",
      "context": "The sentence where it was mentioned",
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

EXTRACTION RULES:
1. ONLY extract REAL company/brand/organization names
2. Company names are proper nouns (usually capitalized)
3. Look for:
   - Startups and tech companies
   - Consumer brands (fashion, beauty, food, beverage)
   - Media organizations and publications
   - Service companies and platforms
   - Any business entity with a proper name

4. DO NOT extract:
   - Random sentence fragments
   - Common phrases or expressions
   - Individual words like "and", "but", "the"
   - Descriptive phrases that aren't company names
   - Generic terms without a specific company

5. If the text mentions NO real companies, return an empty companies array:
{
  "companies": [],
  "metadata": {
    "processingTime": 0,
    "tokenCount": 0,
    "modelVersion": "claude-3-5-sonnet-20241022"
  }
}

Remember: Only extract ACTUAL COMPANY NAMES. If you're not sure it's a real company name, don't include it.

Return ONLY the JSON object, no additional text.`;
  }

  // Batch extraction for multiple pieces of content
  async batchExtract(
    contents: Array<{ content: string; newsletterName: string; id?: string }>
  ) {
    // Process sequentially with delays to avoid rate limits
    const results: Array<PromiseSettledResult<any>> = [];

    for (let i = 0; i < contents.length; i++) {
      const { content, newsletterName, id } = contents[i];

      // Add delay between requests (except for the first one)
      if (i > 0) {
        const delayMs = 2000; // 2 second delay between emails
        console.log(`[BatchExtract] ⏰ Waiting ${delayMs}ms before processing next email...`);
        await this.sleep(delayMs);
      }

      const result = await Promise.allSettled([
        this.extractCompanies(content, newsletterName).then(result => ({
          id,
          newsletterName,
          ...result
        }))
      ]);

      results.push(result[0]);
    }

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

  // Helper method to determine if an error is retryable
  private isRetryableError(error: any): boolean {
    if (!error) {
      return false;
    }

    if (error?.name === 'ClaudeTimeoutError') {
      console.log('[ClaudeExtractor] ⏱️ Timeout error - will retry');
      return true;
    }

    // Don't retry authentication errors
    if (error?.status === 401) {
      console.error('[ClaudeExtractor] 🔐 Authentication error - not retryable');
      return false;
    }
    
    // Retry rate limit errors
    if (error?.status === 429) {
      console.log('[ClaudeExtractor] ⏳ Rate limit error - will retry');
      return true;
    }
    
    // Retry 5xx server errors
    if (error?.status >= 500 && error?.status < 600) {
      console.log('[ClaudeExtractor] 🔄 Server error - will retry');
      return true;
    }
    
    // Retry network/fetch errors
    if (error?.message?.includes('fetch') || 
        error?.message?.includes('network') ||
        error?.message?.includes('ECONNREFUSED') ||
        error?.message?.includes('ETIMEDOUT')) {
      console.log('[ClaudeExtractor] 🌐 Network error - will retry');
      return true;
    }
    
    // Retry timeout errors
    if (error?.message?.includes('timeout')) {
      console.log('[ClaudeExtractor] ⏱️ Timeout error - will retry');
      return true;
    }
    
    // Don't retry other errors (400, 403, 404, etc.)
    return false;
  }

  // Calculate exponential backoff delay with jitter
  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^(attempt-1)
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    
    // Add jitter (random 0-25% additional delay) to prevent thundering herd
    const jitter = Math.random() * 0.25 * exponentialDelay;
    
    // Cap at 30 seconds
    const maxDelay = 30000;
    const totalDelay = Math.min(exponentialDelay + jitter, maxDelay);
    
    return Math.floor(totalDelay);
  }

  // Sleep helper
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fallback extraction method using pattern matching
  private async fallbackExtraction(content: string, newsletterName: string) {
    const startTime = Date.now();
    console.log('[FallbackExtractor] 🔍 Starting pattern-based extraction...');
    
    const companies: any[] = [];
    const processedNames = new Set<string>();
    
    // Common patterns for company mentions
    const patterns = [
      // Company raised funding
      /([A-Z][A-Za-z0-9\s&.]+?)\s+(?:raised|raises|secured|closed|announced|completed)\s+\$?([0-9]+[MBK]|\d+\s*(?:million|billion))/gi,
      // Company valued at
      /([A-Z][A-Za-z0-9\s&.]+?)\s+(?:valued at|valuation of)\s+\$?([0-9]+[MBK]|\d+\s*(?:million|billion))/gi,
      // Company acquired/acquired by
      /([A-Z][A-Za-z0-9\s&.]+?)\s+(?:acquired|acquires|bought|buys)\s+([A-Z][A-Za-z0-9\s&.]+)/gi,
      // Company launched/launches
      /([A-Z][A-Za-z0-9\s&.]+?)\s+(?:launched|launches|introduced|introduces|unveiled|unveils)/gi,
      // CEO/Founder of Company
      /(?:CEO|Founder|Co-founder|President)\s+(?:of|at)\s+([A-Z][A-Za-z0-9\s&.]+)/gi,
      // Company's product/service
      /([A-Z][A-Za-z0-9\s&.]+?)(?:'s|\s+)(?:platform|product|service|app|solution|tool)/gi,
      // Startup/company patterns
      /(?:startup|company|firm|venture)\s+([A-Z][A-Za-z0-9\s&.]+)/gi,
    ];
    
    // Extract companies using patterns
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const companyName = match[1]?.trim();
        
        if (companyName && 
            companyName.length > 2 && 
            companyName.length < 50 &&
            !processedNames.has(companyName.toLowerCase())) {
          
          // Basic validation - exclude common words
          const excludeWords = ['The', 'This', 'That', 'These', 'Those', 'Their', 'There', 
                              'Today', 'Yesterday', 'Tomorrow', 'Monday', 'Tuesday', 'Wednesday',
                              'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February',
                              'March', 'April', 'May', 'June', 'July', 'August', 'September',
                              'October', 'November', 'December'];
          
          if (excludeWords.includes(companyName)) continue;
          
          processedNames.add(companyName.toLowerCase());
          
          // Extract context around the mention
          const mentionIndex = content.indexOf(companyName);
          const contextStart = Math.max(0, mentionIndex - 100);
          const contextEnd = Math.min(content.length, mentionIndex + companyName.length + 100);
          const context = content.slice(contextStart, contextEnd).trim();
          
          companies.push({
            name: companyName,
            description: `Company mentioned in ${newsletterName}`,
            context: context.length > 200 ? context.slice(0, 200) + '...' : context,
            sentiment: 'neutral',
            confidence: 0.5 // Lower confidence for fallback extraction
          });
          
          console.log(`[FallbackExtractor] Found: ${companyName}`);
        }
      }
    }
    
    // Deduplicate by name
    const uniqueCompanies = Array.from(
      new Map(companies.map(c => [c.name.toLowerCase(), c])).values()
    );
    
    const processingTime = Date.now() - startTime;
    console.log(`[FallbackExtractor] ✅ Extracted ${uniqueCompanies.length} unique companies in ${processingTime}ms`);
    
    return {
      companies: uniqueCompanies.slice(0, 20), // Limit to 20 companies
      metadata: {
        processingTime,
        tokenCount: 0,
        modelVersion: 'fallback-pattern-matcher-v1',
        fallbackUsed: true
      }
    };
  }

  // Removed custom fetch wrapper - it was causing issues
}
