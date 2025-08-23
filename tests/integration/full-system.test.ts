import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Integration Tests - Full System', () => {
  beforeEach(() => {
    // Set up all required environment variables
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Module Loading', () => {
    it('should load all core modules without errors', async () => {
      const modules = await Promise.all([
        import('@substack-intelligence/shared'),
        import('@substack-intelligence/database'),
        import('@substack-intelligence/ai')
      ]);

      expect(modules).toHaveLength(3);
      modules.forEach(module => {
        expect(module).toBeDefined();
      });
    });
  });

  describe('Deduplication System', () => {
    it('should correctly deduplicate companies', async () => {
      const { normalizeCompanyName, deduplicateCompanies } = await import('@substack-intelligence/shared');

      // Test normalization
      const testCases = [
        ['Glossier Inc.', 'glossier'],
        ['23&Me', '23andme'],
        ['23 and Me', '23andme'],
        ['Warby Parker', 'warbyparker'],
        ['Away Travel, LLC', 'awaytravel']
      ];

      testCases.forEach(([input, expected]) => {
        expect(normalizeCompanyName(input)).toBe(expected);
      });

      // Test deduplication
      const companies = [
        { name: 'Glossier', value: 1 },
        { name: 'glossier inc.', value: 2 },
        { name: '23andMe', value: 3 },
        { name: '23 & Me', value: 4 },
        { name: 'Warby Parker', value: 5 }
      ];

      const deduped = deduplicateCompanies(companies);
      expect(deduped).toHaveLength(3);
      expect(deduped.map(c => c.name)).toEqual(['Glossier', '23andMe', 'Warby Parker']);
    });
  });

  describe('AI Services Integration', () => {
    it('should initialize ClaudeExtractor with public methods', async () => {
      const { ClaudeExtractor } = await import('@substack-intelligence/ai');
      
      const extractor = new ClaudeExtractor();
      expect(extractor).toBeDefined();
      
      // Test that getSystemPrompt is public and works
      const systemPrompt = extractor.getSystemPrompt();
      expect(systemPrompt).toContain('JSON');
      expect(systemPrompt).toContain('Consumer brands');
      expect(systemPrompt).toContain('confidence');
    });

    it('should initialize EmbeddingService', async () => {
      const { EmbeddingService } = await import('@substack-intelligence/ai');
      
      const service = new EmbeddingService();
      expect(service).toBeDefined();
      
      // Check that public methods exist
      expect(service.generateCompanyEmbedding).toBeDefined();
      expect(service.findSimilarCompanies).toBeDefined();
      expect(service.semanticSearch).toBeDefined();
      expect(service.batchGenerateEmbeddings).toBeDefined();
      expect(service.getEmbeddingStats).toBeDefined();
    });
  });

  describe('Database Module', () => {
    it('should export database client functions', async () => {
      const database = await import('@substack-intelligence/database');
      
      expect(database.createServiceRoleClient).toBeDefined();
      expect(database.createClientComponentClient).toBeDefined();
      expect(database.createServerComponentClient).toBeDefined();
      
      // Functions should be callable (though they might fail without real DB)
      expect(typeof database.createServiceRoleClient).toBe('function');
    });

    it('should export query functions without React cache errors', async () => {
      const database = await import('@substack-intelligence/database');
      
      // Check that query functions are exported
      expect(database.getCompanyById).toBeDefined();
      expect(database.getCompanies).toBeDefined();
      expect(database.getDailyIntelligence).toBeDefined();
      expect(database.getEmailById).toBeDefined();
      expect(database.getRecentEmails).toBeDefined();
      expect(database.getTopNewsletters).toBeDefined();
      expect(database.searchCompanies).toBeDefined();
      expect(database.getAnalytics).toBeDefined();
    });
  });

  describe('Schema Validation', () => {
    it('should export all required schemas', async () => {
      const { 
        CompanyMentionSchema,
        CompanySchema,
        EmailSchema,
        ExtractionResultSchema,
        GmailMessageSchema,
        DateRangeSchema,
        PaginationSchema
      } = await import('@substack-intelligence/shared');

      // All schemas should be Zod schemas
      expect(CompanyMentionSchema.parse).toBeDefined();
      expect(CompanySchema.parse).toBeDefined();
      expect(EmailSchema.parse).toBeDefined();
      expect(ExtractionResultSchema.parse).toBeDefined();
      expect(GmailMessageSchema.parse).toBeDefined();
      expect(DateRangeSchema.parse).toBeDefined();
      expect(PaginationSchema.parse).toBeDefined();
    });

    it('should validate extraction results correctly', async () => {
      const { ExtractionResultSchema } = await import('@substack-intelligence/shared');

      const validResult = {
        companies: [
          {
            name: 'TestCorp',
            description: 'A test company',
            context: 'TestCorp announced new funding',
            sentiment: 'positive',
            confidence: 0.85
          }
        ],
        metadata: {
          processingTime: 1500,
          tokenCount: 250,
          modelVersion: 'claude-3-opus'
        }
      };

      expect(() => ExtractionResultSchema.parse(validResult)).not.toThrow();

      const invalidResult = {
        companies: [
          {
            name: 'TestCorp',
            // Missing required fields
          }
        ],
        metadata: {}
      };

      expect(() => ExtractionResultSchema.parse(invalidResult)).toThrow();
    });
  });

  describe('End-to-End Flow Simulation', () => {
    it('should simulate a complete extraction and deduplication flow', async () => {
      const { deduplicateCompanies, ExtractionResultSchema } = await import('@substack-intelligence/shared');

      // Simulate extraction results from multiple newsletters
      const extractionResults = [
        {
          companies: [
            { name: 'Glossier', description: 'Beauty brand', context: 'Raised funding', sentiment: 'positive', confidence: 0.9 },
            { name: 'Warby Parker', description: 'Eyewear', context: 'New stores', sentiment: 'neutral', confidence: 0.8 }
          ],
          metadata: { processingTime: 1000, tokenCount: 200, modelVersion: 'test' }
        },
        {
          companies: [
            { name: 'glossier inc.', description: 'Beauty', context: 'Expansion', sentiment: 'positive', confidence: 0.85 },
            { name: 'Away Travel', description: 'Luggage', context: 'New product', sentiment: 'positive', confidence: 0.7 }
          ],
          metadata: { processingTime: 1200, tokenCount: 180, modelVersion: 'test' }
        }
      ];

      // Validate extraction results
      extractionResults.forEach(result => {
        expect(() => ExtractionResultSchema.parse(result)).not.toThrow();
      });

      // Combine and deduplicate companies
      const allCompanies = extractionResults.flatMap(r => r.companies);
      const uniqueCompanies = deduplicateCompanies(allCompanies);

      // Should have 3 unique companies (Glossier duplicated)
      expect(uniqueCompanies).toHaveLength(3);
      expect(uniqueCompanies.map(c => c.name)).toContain('Glossier');
      expect(uniqueCompanies.map(c => c.name)).toContain('Warby Parker');
      expect(uniqueCompanies.map(c => c.name)).toContain('Away Travel');
    });
  });
});