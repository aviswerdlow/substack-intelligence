import OpenAI from 'openai';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { z } from 'zod';
import { axiomLogger } from '../../../apps/web/lib/monitoring/axiom';

const CompanyEmbeddingSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  embedding: z.array(z.number()).length(1536) // OpenAI text-embedding-3-small dimensions
});

const SimilarCompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  similarity: z.number().min(0).max(1)
});

export class EmbeddingService {
  private openai: OpenAI;
  private supabase;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.supabase = createServiceRoleClient();
  }

  /**
   * Generate embedding for a company based on name and description
   */
  async generateCompanyEmbedding(companyId: string): Promise<number[] | null> {
    const startTime = Date.now();

    try {
      // Get company data
      const { data: company, error } = await this.supabase
        .from('companies')
        .select('id, name, description, industry, website')
        .eq('id', companyId)
        .single();

      if (error || !company) {
        throw new Error(`Company not found: ${companyId}`);
      }

      // Create embedding text combining available information
      const embeddingText = this.createEmbeddingText({
        name: company.name,
        description: company.description,
        industry: company.industry || [],
        website: company.website
      });

      // Generate embedding using OpenAI
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: embeddingText,
        dimensions: 1536 // Standard dimension size
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('Failed to generate embedding');
      }

      // Store embedding in database
      const { error: updateError } = await this.supabase
        .from('companies')
        .update({ 
          embedding: `[${embedding.join(',')}]`,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId);

      if (updateError) {
        throw updateError;
      }

      await axiomLogger.log('embedding-service', 'embedding_generated', {
        companyId,
        companyName: company.name,
        textLength: embeddingText.length,
        processingTime: Date.now() - startTime,
        embeddingDimensions: embedding.length
      });

      return embedding;

    } catch (error) {
      console.error(`Failed to generate embedding for company ${companyId}:`, error);
      
      await axiomLogger.logError(error as Error, {
        operation: 'generateCompanyEmbedding',
        companyId,
        processingTime: Date.now() - startTime
      });

      return null;
    }
  }

  /**
   * Find companies similar to the given company using vector similarity
   */
  async findSimilarCompanies(
    companyId: string, 
    options: {
      limit?: number;
      threshold?: number;
      excludeIds?: string[];
    } = {}
  ): Promise<Array<{ id: string; name: string; description: string | null; similarity: number }>> {
    const { limit = 5, threshold = 0.7, excludeIds = [] } = options;
    const startTime = Date.now();

    try {
      // Ensure the company has an embedding
      const { data: company, error: companyError } = await this.supabase
        .from('companies')
        .select('id, name, embedding')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        throw new Error(`Company not found: ${companyId}`);
      }

      if (!company.embedding) {
        // Generate embedding if it doesn't exist
        console.log(`Generating embedding for company ${companyId} on-demand`);
        await this.generateCompanyEmbedding(companyId);
        
        // Retry fetching the company with embedding
        const { data: updatedCompany } = await this.supabase
          .from('companies')
          .select('id, name, embedding')
          .eq('id', companyId)
          .single();

        if (!updatedCompany?.embedding) {
          throw new Error('Failed to generate embedding for company');
        }
      }

      // Use Supabase's built-in vector similarity function
      const { data: similarCompanies, error } = await this.supabase
        .rpc('match_companies', {
          query_company_id: companyId,
          match_threshold: threshold,
          match_count: limit + excludeIds.length + 1 // +1 to exclude self
        });

      if (error) {
        throw error;
      }

      // Filter out excluded companies and the original company
      const filtered = (similarCompanies || [])
        .filter((comp: any) => comp.id !== companyId && !excludeIds.includes(comp.id))
        .slice(0, limit)
        .map((comp: any) => ({
          id: comp.id,
          name: comp.name,
          description: comp.description,
          similarity: comp.similarity
        }));

      await axiomLogger.log('embedding-service', 'similarity_search_completed', {
        queryCompanyId: companyId,
        resultsCount: filtered.length,
        threshold,
        processingTime: Date.now() - startTime
      });

      return SimilarCompanySchema.array().parse(filtered);

    } catch (error) {
      console.error(`Failed to find similar companies for ${companyId}:`, error);
      
      await axiomLogger.logError(error as Error, {
        operation: 'findSimilarCompanies',
        companyId,
        processingTime: Date.now() - startTime
      });

      return [];
    }
  }

  /**
   * Batch generate embeddings for multiple companies
   */
  async batchGenerateEmbeddings(
    companyIds: string[],
    options: { concurrency?: number } = {}
  ): Promise<{ success: string[]; failed: string[] }> {
    const { concurrency = 3 } = options;
    const success: string[] = [];
    const failed: string[] = [];

    console.log(`Generating embeddings for ${companyIds.length} companies...`);

    // Process in batches to avoid rate limits
    for (let i = 0; i < companyIds.length; i += concurrency) {
      const batch = companyIds.slice(i, i + concurrency);
      
      const results = await Promise.allSettled(
        batch.map(id => this.generateCompanyEmbedding(id))
      );

      results.forEach((result, index) => {
        const companyId = batch[index];
        if (result.status === 'fulfilled' && result.value) {
          success.push(companyId);
        } else {
          failed.push(companyId);
          console.error(`Failed to generate embedding for ${companyId}:`, 
            result.status === 'rejected' ? result.reason : 'Unknown error');
        }
      });

      // Rate limiting between batches
      if (i + concurrency < companyIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    await axiomLogger.log('embedding-service', 'batch_generation_completed', {
      totalCompanies: companyIds.length,
      successful: success.length,
      failed: failed.length,
      concurrency
    });

    return { success, failed };
  }

  /**
   * Find companies without embeddings that need to be processed
   */
  async getCompaniesNeedingEmbeddings(limit: number = 100): Promise<string[]> {
    try {
      const { data: companies, error } = await this.supabase
        .from('companies')
        .select('id')
        .is('embedding', null)
        .limit(limit);

      if (error) {
        throw error;
      }

      return companies?.map(c => c.id) || [];

    } catch (error) {
      console.error('Failed to get companies needing embeddings:', error);
      return [];
    }
  }

  /**
   * Semantic search across all companies using natural language query
   */
  async semanticSearch(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      industries?: string[];
    } = {}
  ): Promise<Array<{ id: string; name: string; description: string | null; similarity: number }>> {
    const { limit = 10, threshold = 0.6, industries = [] } = options;
    const startTime = Date.now();

    try {
      // Generate embedding for the search query
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        dimensions: 1536
      });

      const queryEmbedding = response.data[0]?.embedding;
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      // Convert to PostgreSQL vector format
      const embeddingVector = `[${queryEmbedding.join(',')}]`;

      // Build the query with optional industry filter
      let sqlQuery = this.supabase
        .from('companies')
        .select('id, name, description')
        .not('embedding', 'is', null);

      // Add industry filter if specified
      if (industries.length > 0) {
        sqlQuery = sqlQuery.overlaps('industry', industries);
      }

      // Use raw SQL for vector similarity search
      const { data: results, error } = await this.supabase
        .rpc('semantic_search_companies', {
          query_embedding: embeddingVector,
          match_threshold: threshold,
          match_count: limit
        });

      if (error) {
        throw error;
      }

      await axiomLogger.log('embedding-service', 'semantic_search_completed', {
        query,
        resultsCount: results?.length || 0,
        threshold,
        industries,
        processingTime: Date.now() - startTime
      });

      return results || [];

    } catch (error) {
      console.error(`Semantic search failed for query "${query}":`, error);
      
      await axiomLogger.logError(error as Error, {
        operation: 'semanticSearch',
        query,
        processingTime: Date.now() - startTime
      });

      return [];
    }
  }

  /**
   * Create optimized text for embedding generation
   */
  private createEmbeddingText(company: {
    name: string;
    description: string | null;
    industry: string[];
    website: string | null;
  }): string {
    const parts: string[] = [];

    // Company name (highest weight)
    parts.push(`Company: ${company.name}`);

    // Description if available
    if (company.description) {
      parts.push(`Description: ${company.description}`);
    }

    // Industry categories
    if (company.industry && company.industry.length > 0) {
      parts.push(`Industry: ${company.industry.join(', ')}`);
    }

    // Domain information (can indicate company type/industry)
    if (company.website) {
      try {
        const domain = new URL(company.website).hostname.replace('www.', '');
        parts.push(`Domain: ${domain}`);
      } catch {
        // Ignore invalid URLs
      }
    }

    return parts.join('. ').slice(0, 8000); // Limit to reasonable token count
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStats(): Promise<{
    totalCompanies: number;
    companiesWithEmbeddings: number;
    coveragePercentage: number;
  }> {
    try {
      const [totalResult, embeddedResult] = await Promise.all([
        this.supabase
          .from('companies')
          .select('*', { count: 'exact', head: true }),
        this.supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .not('embedding', 'is', null)
      ]);

      const totalCompanies = totalResult.count || 0;
      const companiesWithEmbeddings = embeddedResult.count || 0;
      const coveragePercentage = totalCompanies > 0 
        ? Math.round((companiesWithEmbeddings / totalCompanies) * 100) 
        : 0;

      return {
        totalCompanies,
        companiesWithEmbeddings,
        coveragePercentage
      };

    } catch (error) {
      console.error('Failed to get embedding stats:', error);
      return {
        totalCompanies: 0,
        companiesWithEmbeddings: 0,
        coveragePercentage: 0
      };
    }
  }
}

export type { CompanyEmbeddingSchema, SimilarCompanySchema };