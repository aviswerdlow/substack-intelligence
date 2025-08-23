import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbeddingService } from '@substack-intelligence/ai';

// Mock axiom logger
vi.mock('../../../apps/web/lib/monitoring/axiom', () => ({
  axiomLogger: {
    log: vi.fn().mockResolvedValue(undefined),
    logError: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock setTimeout to avoid delays in tests
vi.stubGlobal('setTimeout', (fn: Function) => {
  // Call the function immediately to avoid delays
  fn();
  return 1;
});

// Create mock OpenAI client with proper error handling
const mockEmbeddingsCreate = vi.fn();
const mockOpenAI = {
  embeddings: {
    create: mockEmbeddingsCreate.mockImplementation(async (params) => {
      // Default successful response structure matching OpenAI's API
      return {
        data: [{
          object: 'embedding',
          embedding: new Array(params.dimensions || 1536).fill(0).map(() => Math.random()),
          index: 0
        }],
        model: params.model || 'text-embedding-3-small',
        object: 'list',
        usage: {
          prompt_tokens: Math.floor(Math.random() * 100) + 10,
          total_tokens: Math.floor(Math.random() * 100) + 10
        }
      };
    })
  }
};

// Create mock Supabase client  
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockNot = vi.fn();
const mockIs = vi.fn();
const mockUpdate = vi.fn();
const mockSingle = vi.fn();
const mockRpc = vi.fn();
const mockCount = vi.fn();
const mockOverlaps = vi.fn();

// Create a chainable query builder mock
const createQueryBuilder = () => {
  const queryBuilder = {
    select: mockSelect,
    eq: mockEq,
    not: mockNot,
    is: mockIs,  
    update: mockUpdate,
    single: mockSingle,
    count: mockCount,
    overlaps: mockOverlaps
  };
  
  // Make all chain methods return the query builder except single and count
  mockSelect.mockReturnValue(queryBuilder);
  mockEq.mockReturnValue(queryBuilder);
  mockNot.mockReturnValue(queryBuilder);
  mockIs.mockReturnValue(queryBuilder);
  mockUpdate.mockReturnValue(queryBuilder);
  mockOverlaps.mockReturnValue(queryBuilder);
  
  return queryBuilder;
};

const mockSupabase = {
  from: mockFrom.mockImplementation(() => createQueryBuilder()),
  rpc: mockRpc
};

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
    
    // Reset OpenAI mock to default implementation
    mockEmbeddingsCreate.mockImplementation(async (params) => {
      return {
        data: [{
          object: 'embedding',
          embedding: mockEmbedding,
          index: 0
        }],
        model: params.model || 'text-embedding-3-small',
        object: 'list',
        usage: {
          prompt_tokens: Math.floor(Math.random() * 100) + 10,
          total_tokens: Math.floor(Math.random() * 100) + 10
        }
      };
    });
    
    // Clear all Supabase mocks
    mockFrom.mockClear();
    mockSelect.mockClear();
    mockEq.mockClear();
    mockNot.mockClear();
    mockIs.mockClear();
    mockUpdate.mockClear();
    mockSingle.mockClear();
    mockRpc.mockClear();
    mockCount.mockClear();
    mockOverlaps.mockClear();
    
    // Reset the from mock to return a fresh query builder
    mockFrom.mockImplementation(() => createQueryBuilder());
    
    // Create EmbeddingService with injected mock clients
    embeddingService = new EmbeddingService(mockOpenAI as any, mockSupabase);
  });

  describe('generateCompanyEmbedding', () => {
    it('should generate and store embedding for a company', async () => {
      // Mock Supabase client methods - the chain ends with single() which returns a promise
      mockSingle.mockResolvedValue({
        data: mockCompany,
        error: null
      });
      
      // Update also needs to return from the chain
      mockUpdate.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await embeddingService.generateCompanyEmbedding(mockCompany.id);

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: expect.stringContaining('Glossier'),
        dimensions: 1536
      });
    });

    it('should handle company not found error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Company not found' }
      });

      const result = await embeddingService.generateCompanyEmbedding('invalid-id');

      expect(result).toBeNull();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockSingle.mockResolvedValue({
        data: mockCompany,
        error: null
      });

      mockEmbeddingsCreate.mockRejectedValue(new Error('OpenAI API Error'));

      const result = await embeddingService.generateCompanyEmbedding(mockCompany.id);

      expect(result).toBeNull();
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: expect.stringContaining('Glossier'),
        dimensions: 1536
      });
    });
  });

  describe('findSimilarCompanies', () => {
    it('should find similar companies using vector similarity', async () => {
      // Mock company with embedding
      mockSingle.mockResolvedValue({
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

      mockRpc.mockResolvedValue({
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
      // First call returns company without embedding
      // Second call returns company with embedding
      mockSingle
        .mockResolvedValueOnce({
          data: { ...mockCompany, embedding: null },
          error: null
        })
        .mockResolvedValueOnce({
          data: { ...mockCompany, embedding: mockEmbedding },
          error: null
        });

      // Mock update for embedding generation
      mockUpdate.mockResolvedValue({ error: null });

      // Mock similarity search
      mockRpc.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await embeddingService.findSimilarCompanies(mockCompany.id);

      expect(mockEmbeddingsCreate).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('semanticSearch', () => {
    it('should perform semantic search with natural language query', async () => {
      // Mock search results
      const mockResults = [
        {
          id: mockCompany.id,
          name: mockCompany.name,
          description: mockCompany.description,
          similarity: 0.8
        }
      ];

      mockRpc.mockResolvedValue({
        data: mockResults,
        error: null
      });

      const result = await embeddingService.semanticSearch('beauty companies');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'Glossier',
        similarity: 0.8
      });

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'beauty companies',
        dimensions: 1536
      });
    });
  });

  describe('batchGenerateEmbeddings', () => {
    it('should process multiple companies with concurrency control', async () => {
      const companyIds = ['id1', 'id2', 'id3'];
      
      // Mock the generateCompanyEmbedding method directly instead of mocking the underlying calls
      const mockGenerateEmbedding = vi.fn().mockResolvedValue(mockEmbedding);
      embeddingService.generateCompanyEmbedding = mockGenerateEmbedding;

      const result = await embeddingService.batchGenerateEmbeddings(companyIds, {
        concurrency: 2
      });

      expect(result.success).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(3);
    }, 30000);

    it('should handle partial failures in batch processing', async () => {
      const companyIds = ['id1', 'id2', 'id3'];
      
      // Mock mixed success/failure responses
      const mockGenerateEmbedding = vi.fn()
        .mockResolvedValueOnce(mockEmbedding)  // id1 success
        .mockResolvedValueOnce(null)           // id2 failure
        .mockResolvedValueOnce(mockEmbedding); // id3 success
        
      embeddingService.generateCompanyEmbedding = mockGenerateEmbedding;

      const result = await embeddingService.batchGenerateEmbeddings(companyIds);

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(3);
    }, 30000);

    it('should handle batch processing with proper error handling', async () => {
      const companyIds = ['id1', 'id2'];
      
      // Mock one success and one async error
      const mockGenerateEmbedding = vi.fn()
        .mockResolvedValueOnce(mockEmbedding)  // id1 success
        .mockRejectedValueOnce(new Error('Async error')); // id2 async error
        
      embeddingService.generateCompanyEmbedding = mockGenerateEmbedding;

      const result = await embeddingService.batchGenerateEmbeddings(companyIds, {
        concurrency: 1
      });

      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.success).toContain('id1');
      expect(result.failed).toContain('id2');
    }, 30000);
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
      // Mock the first call (.from().select() with count)
      const mockFirstQueryBuilder = {
        select: vi.fn().mockResolvedValue({ count: 100, error: null })
      };
      
      // Mock the second call (.from().select().not() with count)  
      const mockSecondQueryBuilder = {
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue({ count: 75, error: null })
        })
      };
      
      // Set up mockFrom to return different query builders for each call
      mockFrom
        .mockReturnValueOnce(mockFirstQueryBuilder)
        .mockReturnValueOnce(mockSecondQueryBuilder);

      const stats = await embeddingService.getEmbeddingStats();

      expect(stats).toEqual({
        totalCompanies: 100,
        companiesWithEmbeddings: 75,
        coveragePercentage: 75
      });
    });
  });
});