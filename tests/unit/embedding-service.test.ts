import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbeddingService } from '@substack-intelligence/ai';

// Mock OpenAI SDK
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: vi.fn()
    }
  }))
}));

// Mock Supabase client
vi.mock('@substack-intelligence/database', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn(),
      rpc: vi.fn()
    }))
  }))
}));

// Mock Axiom logger
vi.mock('../../../apps/web/lib/monitoring/axiom', () => ({
  axiomLogger: {
    log: vi.fn(),
    logError: vi.fn()
  }
}));

describe('EmbeddingService', () => {
  let embeddingService: EmbeddingService;
  const mockEmbedding = new Array(1536).fill(0).map((_, i) => Math.random());
  
  const mockCompany = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Glossier',
    description: 'Direct-to-consumer beauty brand',
    industry: ['Beauty', 'E-commerce'],
    website: 'https://glossier.com'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variables
    process.env.OPENAI_API_KEY = 'test-openai-key';
    
    embeddingService = new EmbeddingService();
  });

  describe('generateCompanyEmbedding', () => {
    it('should generate and store embedding for a company', async () => {
      // Mock Supabase client methods
      const mockSupabase = (embeddingService as any).supabase;
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockCompany,
        error: null
      });
      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      });

      // Mock OpenAI response
      const mockOpenAI = (embeddingService as any).openai;
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{
          embedding: mockEmbedding
        }]
      });

      const result = await embeddingService.generateCompanyEmbedding(mockCompany.id);

      expect(result).toEqual(mockEmbedding);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: expect.stringContaining('Glossier'),
        dimensions: 1536
      });
    });

    it('should handle company not found error', async () => {
      const mockSupabase = (embeddingService as any).supabase;
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Company not found' }
      });

      const result = await embeddingService.generateCompanyEmbedding('invalid-id');

      expect(result).toBeNull();
    });

    it('should handle OpenAI API errors', async () => {
      const mockSupabase = (embeddingService as any).supabase;
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockCompany,
        error: null
      });

      const mockOpenAI = (embeddingService as any).openai;
      mockOpenAI.embeddings.create.mockRejectedValue(new Error('OpenAI API Error'));

      const result = await embeddingService.generateCompanyEmbedding(mockCompany.id);

      expect(result).toBeNull();
    });
  });

  describe('findSimilarCompanies', () => {
    it('should find similar companies using vector similarity', async () => {
      const mockSupabase = (embeddingService as any).supabase;
      
      // Mock company with embedding
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { ...mockCompany, embedding: mockEmbedding },
        error: null
      });

      // Mock similarity search results
      const mockSimilarCompanies = [
        {
          id: '456e7890-e12b-34c5-d678-901234567890',
          name: 'Fenty Beauty',
          description: 'Beauty brand by Rihanna',
          similarity: 0.85
        }
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockSimilarCompanies,
        error: null
      });

      const result = await embeddingService.findSimilarCompanies(mockCompany.id);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'Fenty Beauty',
        similarity: 0.85
      });
    });

    it('should generate embedding on-demand if missing', async () => {
      const mockSupabase = (embeddingService as any).supabase;
      
      // First call returns company without embedding
      // Second call returns company with embedding
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { ...mockCompany, embedding: null },
          error: null
        })
        .mockResolvedValueOnce({
          data: { ...mockCompany, embedding: mockEmbedding },
          error: null
        });

      // Mock update for embedding generation
      mockSupabase.from().update().eq.mockResolvedValue({ error: null });

      // Mock OpenAI response
      const mockOpenAI = (embeddingService as any).openai;
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }]
      });

      // Mock similarity search
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await embeddingService.findSimilarCompanies(mockCompany.id);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('semanticSearch', () => {
    it('should perform semantic search with natural language query', async () => {
      const mockSupabase = (embeddingService as any).supabase;
      const mockOpenAI = (embeddingService as any).openai;

      // Mock OpenAI embedding generation
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }]
      });

      // Mock search results
      const mockResults = [
        {
          id: mockCompany.id,
          name: mockCompany.name,
          description: mockCompany.description,
          similarity: 0.8
        }
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockResults,
        error: null
      });

      const result = await embeddingService.semanticSearch('beauty companies');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'Glossier',
        similarity: 0.8
      });

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'beauty companies',
        dimensions: 1536
      });
    });
  });

  describe('batchGenerateEmbeddings', () => {
    it('should process multiple companies with concurrency control', async () => {
      const companyIds = ['id1', 'id2', 'id3'];
      
      // Mock successful embedding generation
      vi.spyOn(embeddingService, 'generateCompanyEmbedding')
        .mockResolvedValue(mockEmbedding);

      const result = await embeddingService.batchGenerateEmbeddings(companyIds, {
        concurrency: 2
      });

      expect(result.success).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle partial failures in batch processing', async () => {
      const companyIds = ['id1', 'id2', 'id3'];
      
      // Mock mixed success/failure
      vi.spyOn(embeddingService, 'generateCompanyEmbedding')
        .mockResolvedValueOnce(mockEmbedding)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockEmbedding);

      const result = await embeddingService.batchGenerateEmbeddings(companyIds);

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
    });
  });

  describe('createEmbeddingText', () => {
    it('should create optimized text for embedding', () => {
      const createEmbeddingText = (embeddingService as any).createEmbeddingText;
      
      const text = createEmbeddingText({
        name: 'Glossier',
        description: 'Direct-to-consumer beauty brand',
        industry: ['Beauty', 'E-commerce'],
        website: 'https://glossier.com'
      });

      expect(text).toContain('Company: Glossier');
      expect(text).toContain('Description: Direct-to-consumer beauty brand');
      expect(text).toContain('Industry: Beauty, E-commerce');
      expect(text).toContain('Domain: glossier.com');
    });

    it('should handle missing optional fields', () => {
      const createEmbeddingText = (embeddingService as any).createEmbeddingText;
      
      const text = createEmbeddingText({
        name: 'TestCorp',
        description: null,
        industry: [],
        website: null
      });

      expect(text).toBe('Company: TestCorp');
    });
  });

  describe('getEmbeddingStats', () => {
    it('should return embedding coverage statistics', async () => {
      const mockSupabase = (embeddingService as any).supabase;
      
      // Mock total companies count
      mockSupabase.from().select.mockReturnValueOnce({
        count: vi.fn().mockResolvedValue({ count: 100 })
      });
      
      // Mock companies with embeddings count
      mockSupabase.from().select.mockReturnValueOnce({
        not: vi.fn(() => ({
          count: vi.fn().mockResolvedValue({ count: 75 })
        }))
      });

      const stats = await embeddingService.getEmbeddingStats();

      expect(stats).toEqual({
        totalCompanies: 100,
        companiesWithEmbeddings: 75,
        coveragePercentage: 75
      });
    });
  });
});