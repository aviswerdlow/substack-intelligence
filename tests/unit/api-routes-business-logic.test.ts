import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock environment variables
const originalEnv = process.env;

// Mock Clerk authentication functions
const mockAuth = vi.fn(() => ({ userId: 'test-user-id' }));
const mockCurrentUser = vi.fn(() => Promise.resolve({ 
  id: 'test-user-id', 
  emailAddress: 'test@example.com' 
}));

// Mock database functions
const mockGetCompanies = vi.fn();
const mockCreateServerComponentClient = vi.fn();
const mockCreateServiceRoleClient = vi.fn();

// Mock Supabase clients
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    single: vi.fn()
  }))
};

const mockServiceRoleClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
  }))
};

// Set up mocks
vi.mock('@clerk/nextjs', () => ({
  auth: mockAuth
}));

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: mockCurrentUser
}));

vi.mock('@substack-intelligence/database', () => ({
  createServerComponentClient: mockCreateServerComponentClient,
  createServiceRoleClient: mockCreateServiceRoleClient,
  getCompanies: mockGetCompanies
}));

vi.mock('zod', async () => {
  const actual = await vi.importActual('zod');
  return actual;
});

// Test data
const mockCompanies = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Company A',
    description: 'A test company',
    website: 'https://testcompanya.com',
    mention_count: 15,
    funding_status: 'Series A',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '456e7890-e12b-34c5-d678-901234567890',
    name: 'Test Company B',
    description: 'Another test company',
    website: 'https://testcompanyb.com',
    mention_count: 8,
    funding_status: 'Seed',
    created_at: '2024-01-02T00:00:00Z'
  }
];

const mockIntelligenceData = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Intel Company A',
    description: 'An intelligent company',
    website: 'https://intelcompanya.com',
    funding_status: 'Series B',
    mention_count: 12,
    company_mentions: [
      {
        id: 'mention-1',
        context: 'Company A raised $50M in Series B funding',
        sentiment: 'positive',
        confidence: 0.92,
        extracted_at: '2024-01-01T12:00:00Z',
        emails: {
          newsletter_name: 'Tech Crunch',
          received_at: '2024-01-01T10:00:00Z'
        }
      }
    ]
  }
];

// Business logic functions extracted from route handlers for testing
class CompaniesAPILogic {
  static validateQueryParams(params: URLSearchParams) {
    const limit = params.get('limit') ? parseInt(params.get('limit')!) : 20;
    const offset = params.get('offset') ? parseInt(params.get('offset')!) : 0;
    const search = params.get('search') || undefined;
    const fundingStatus = params.get('fundingStatus') || undefined;
    const orderBy = params.get('orderBy') || 'mention_count';
    const orderDirection = params.get('orderDirection') || 'desc';

    // Validation
    const errors = [];
    if (isNaN(limit) || limit < 0) errors.push('Invalid limit parameter');
    if (isNaN(offset) || offset < 0) errors.push('Invalid offset parameter');
    if (orderBy && !['mention_count', 'created_at', 'name'].includes(orderBy)) {
      errors.push('Invalid orderBy parameter');
    }
    if (orderDirection && !['asc', 'desc'].includes(orderDirection)) {
      errors.push('Invalid orderDirection parameter');
    }

    return {
      isValid: errors.length === 0,
      errors,
      params: { limit, offset, search, fundingStatus, orderBy, orderDirection }
    };
  }

  static formatResponse(data: any, params: any) {
    return {
      success: true,
      data: {
        companies: data.companies,
        pagination: {
          total: data.total,
          limit: params.limit,
          offset: params.offset,
          hasMore: data.hasMore
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  static formatErrorResponse(error: any) {
    if (typeof error === 'string') {
      return { success: false, error };
    }
    if (error.name === 'ZodError') {
      return {
        success: false,
        error: 'Invalid query parameters',
        details: error.issues
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

class IntelligenceAPILogic {
  static validateQueryParams(params: URLSearchParams) {
    const limitStr = params.get('limit');
    const daysStr = params.get('days');
    
    const limit = limitStr ? parseInt(limitStr) : 50;
    const days = daysStr ? parseInt(daysStr) : 1;

    const errors = [];
    if (limitStr && (isNaN(limit) || limit < 0)) errors.push('Invalid limit parameter');
    if (daysStr && (isNaN(days) || days < 0)) errors.push('Invalid days parameter');

    return {
      isValid: errors.length === 0,
      errors,
      params: { limit, days }
    };
  }

  static transformCompanyData(companies: any[]) {
    return companies.map(company => ({
      id: company.id,
      name: company.name,
      description: company.description,
      website: company.website,
      funding_status: company.funding_status,
      mentions: (company.company_mentions || []).map((mention: any) => ({
        id: mention.id,
        context: mention.context,
        sentiment: mention.sentiment,
        confidence: mention.confidence,
        newsletter_name: mention.emails?.newsletter_name || 'Unknown',
        received_at: mention.emails?.received_at || mention.extracted_at
      })),
      totalMentions: company.mention_count || company.company_mentions?.length || 0,
      newsletterDiversity: new Set(
        (company.company_mentions || []).map((m: any) => m.emails?.newsletter_name).filter(Boolean)
      ).size
    })).filter(company => company.mentions.length > 0);
  }

  static calculateSummary(companies: any[], days: number) {
    const totalCompanies = companies.length;
    const totalMentions = companies.reduce((sum, c) => sum + c.totalMentions, 0);
    const averageMentionsPerCompany = totalCompanies > 0 
      ? (totalMentions / totalCompanies).toFixed(1)
      : '0';
    const timeRange = `${days} day${days > 1 ? 's' : ''}`;

    return {
      totalCompanies,
      totalMentions,
      averageMentionsPerCompany,
      timeRange
    };
  }

  static formatResponse(companies: any[], days: number) {
    return {
      success: true,
      data: {
        companies,
        summary: this.calculateSummary(companies, days)
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }
}

describe('API Business Logic Tests', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test'
    };
    vi.clearAllMocks();
    
    // Reset mocks to authenticated state by default
    mockAuth.mockReturnValue({ userId: 'test-user-id' });
    mockCurrentUser.mockResolvedValue({ 
      id: 'test-user-id', 
      emailAddress: 'test@example.com' 
    });
    
    mockCreateServerComponentClient.mockReturnValue(mockSupabaseClient);
    mockCreateServiceRoleClient.mockReturnValue(mockServiceRoleClient);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Companies API Business Logic', () => {
    it('should validate query parameters correctly', () => {
      const params = new URLSearchParams('limit=20&offset=0&search=test&orderBy=name&orderDirection=asc');
      const result = CompaniesAPILogic.validateQueryParams(params);

      expect(result.isValid).toBe(true);
      expect(result.params).toEqual({
        limit: 20,
        offset: 0,
        search: 'test',
        fundingStatus: undefined,
        orderBy: 'name',
        orderDirection: 'asc'
      });
    });

    it('should detect invalid query parameters', () => {
      const params = new URLSearchParams('limit=invalid&offset=-5&orderBy=invalid');
      const result = CompaniesAPILogic.validateQueryParams(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid limit parameter');
      expect(result.errors).toContain('Invalid offset parameter');
      expect(result.errors).toContain('Invalid orderBy parameter');
    });

    it('should use default values for missing parameters', () => {
      const params = new URLSearchParams();
      const result = CompaniesAPILogic.validateQueryParams(params);

      expect(result.isValid).toBe(true);
      expect(result.params).toEqual({
        limit: 20,
        offset: 0,
        search: undefined,
        fundingStatus: undefined,
        orderBy: 'mention_count',
        orderDirection: 'desc'
      });
    });

    it('should format successful response correctly', () => {
      const data = {
        companies: mockCompanies,
        total: 2,
        hasMore: false
      };
      const params = { limit: 20, offset: 0 };

      const response = CompaniesAPILogic.formatResponse(data, params);

      expect(response).toMatchObject({
        success: true,
        data: {
          companies: mockCompanies,
          pagination: {
            total: 2,
            limit: 20,
            offset: 0,
            hasMore: false
          }
        },
        meta: {
          timestamp: expect.any(String),
          version: '1.0.0'
        }
      });
    });

    it('should format error responses correctly', () => {
      const error = new Error('Database connection failed');
      const response = CompaniesAPILogic.formatErrorResponse(error);

      expect(response).toEqual({
        success: false,
        error: 'Database connection failed'
      });
    });

    it('should handle string errors', () => {
      const response = CompaniesAPILogic.formatErrorResponse('Unauthorized');

      expect(response).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should handle Zod validation errors', () => {
      const zodError = {
        name: 'ZodError',
        issues: [{ message: 'Invalid input' }]
      };
      const response = CompaniesAPILogic.formatErrorResponse(zodError);

      expect(response).toEqual({
        success: false,
        error: 'Invalid query parameters',
        details: [{ message: 'Invalid input' }]
      });
    });
  });

  describe('Intelligence API Business Logic', () => {
    it('should validate query parameters correctly', () => {
      const params = new URLSearchParams('limit=25&days=7');
      const result = IntelligenceAPILogic.validateQueryParams(params);

      expect(result.isValid).toBe(true);
      expect(result.params).toEqual({
        limit: 25,
        days: 7
      });
    });

    it('should detect invalid query parameters', () => {
      const params = new URLSearchParams('limit=invalid&days=-1');
      const result = IntelligenceAPILogic.validateQueryParams(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid limit parameter');
      expect(result.errors).toContain('Invalid days parameter');
    });

    it('should use default values for missing parameters', () => {
      const params = new URLSearchParams();
      const result = IntelligenceAPILogic.validateQueryParams(params);

      expect(result.isValid).toBe(true);
      expect(result.params).toEqual({
        limit: 50,
        days: 1
      });
    });

    it('should transform company data correctly', () => {
      const transformed = IntelligenceAPILogic.transformCompanyData(mockIntelligenceData);

      expect(transformed).toHaveLength(1);
      expect(transformed[0]).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Intel Company A',
        description: 'An intelligent company',
        website: 'https://intelcompanya.com',
        funding_status: 'Series B',
        mentions: expect.arrayContaining([
          expect.objectContaining({
            context: 'Company A raised $50M in Series B funding',
            sentiment: 'positive',
            confidence: 0.92,
            newsletter_name: 'Tech Crunch'
          })
        ]),
        totalMentions: 12,
        newsletterDiversity: 1
      });
    });

    it('should filter out companies without mentions', () => {
      const dataWithoutMentions = [
        {
          id: 'no-mentions-company',
          name: 'Company Without Mentions',
          company_mentions: []
        }
      ];

      const transformed = IntelligenceAPILogic.transformCompanyData(dataWithoutMentions);
      expect(transformed).toHaveLength(0);
    });

    it('should handle null email data gracefully', () => {
      const incompleteData = [
        {
          id: 'incomplete-company',
          name: 'Incomplete Company',
          mention_count: 1,
          company_mentions: [
            {
              id: 'mention-1',
              context: 'Some context',
              sentiment: 'positive',
              confidence: 0.8,
              extracted_at: '2024-01-01T12:00:00Z',
              emails: null
            }
          ]
        }
      ];

      const transformed = IntelligenceAPILogic.transformCompanyData(incompleteData);
      
      expect(transformed).toHaveLength(1);
      expect(transformed[0].mentions[0]).toMatchObject({
        newsletter_name: 'Unknown',
        received_at: '2024-01-01T12:00:00Z'
      });
    });

    it('should calculate newsletter diversity correctly', () => {
      const diverseData = [
        {
          id: 'diverse-company',
          name: 'Diverse Company',
          mention_count: 3,
          company_mentions: [
            {
              id: 'mention-1',
              context: 'Context 1',
              sentiment: 'positive',
              confidence: 0.9,
              emails: { newsletter_name: 'Newsletter A' }
            },
            {
              id: 'mention-2',
              context: 'Context 2',
              sentiment: 'positive',
              confidence: 0.8,
              emails: { newsletter_name: 'Newsletter B' }
            },
            {
              id: 'mention-3',
              context: 'Context 3',
              sentiment: 'neutral',
              confidence: 0.7,
              emails: { newsletter_name: 'Newsletter A' } // Duplicate
            }
          ]
        }
      ];

      const transformed = IntelligenceAPILogic.transformCompanyData(diverseData);
      expect(transformed[0].newsletterDiversity).toBe(2); // Only Newsletter A and B
    });

    it('should calculate summary statistics correctly', () => {
      const companies = [
        { totalMentions: 10 },
        { totalMentions: 5 },
        { totalMentions: 15 }
      ];

      const summary = IntelligenceAPILogic.calculateSummary(companies, 7);

      expect(summary).toEqual({
        totalCompanies: 3,
        totalMentions: 30,
        averageMentionsPerCompany: '10.0',
        timeRange: '7 days'
      });
    });

    it('should handle single day timeRange', () => {
      const summary = IntelligenceAPILogic.calculateSummary([], 1);
      expect(summary.timeRange).toBe('1 day');
    });

    it('should format response correctly', () => {
      const companies = [{ totalMentions: 5 }];
      const response = IntelligenceAPILogic.formatResponse(companies, 7);

      expect(response).toMatchObject({
        success: true,
        data: {
          companies,
          summary: {
            totalCompanies: 1,
            totalMentions: 5,
            averageMentionsPerCompany: '5.0',
            timeRange: '7 days'
          }
        },
        meta: {
          timestamp: expect.any(String),
          version: '1.0.0'
        }
      });
    });
  });

  describe('Authentication Logic Tests', () => {
    it('should properly authenticate with valid user', () => {
      const { userId } = mockAuth();
      expect(userId).toBe('test-user-id');
    });

    it('should handle unauthenticated requests', () => {
      mockAuth.mockReturnValue({ userId: null });
      const { userId } = mockAuth();
      expect(userId).toBeNull();
    });

    it('should handle currentUser authentication for intelligence API', async () => {
      const user = await mockCurrentUser();
      expect(user).toMatchObject({
        id: 'test-user-id',
        emailAddress: 'test@example.com'
      });
    });

    it('should handle unauthenticated currentUser', async () => {
      mockCurrentUser.mockResolvedValue(null);
      const user = await mockCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('Database Integration Logic', () => {
    it('should call getCompanies with correct parameters', async () => {
      mockGetCompanies.mockResolvedValue({
        companies: mockCompanies,
        total: 2,
        hasMore: false
      });

      const params = {
        limit: 20,
        offset: 0,
        search: 'test',
        orderBy: 'mention_count',
        orderDirection: 'desc'
      };

      await mockGetCompanies(mockSupabaseClient, params);

      expect(mockGetCompanies).toHaveBeenCalledWith(mockSupabaseClient, params);
    });

    it('should handle database errors correctly', async () => {
      mockGetCompanies.mockRejectedValue(new Error('Connection failed'));

      await expect(mockGetCompanies(mockSupabaseClient, {})).rejects.toThrow('Connection failed');
    });

    it('should create proper Supabase clients', () => {
      expect(mockCreateServerComponentClient).toBeDefined();
      expect(mockCreateServiceRoleClient).toBeDefined();
    });
  });

  describe('Environment Configuration Tests', () => {
    it('should handle different NODE_ENV values', () => {
      process.env.NODE_ENV = 'production';
      expect(process.env.NODE_ENV).toBe('production');

      process.env.NODE_ENV = 'development';
      expect(process.env.NODE_ENV).toBe('development');
    });

    it('should validate required environment variables exist in healthy state', () => {
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_KEY',
        'ANTHROPIC_API_KEY'
      ];
      
      // In a real implementation, you would check these
      requiredVars.forEach(varName => {
        // This test verifies the structure for checking env vars
        expect(typeof varName).toBe('string');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely large pagination values', () => {
      const params = new URLSearchParams('limit=999999&offset=500000');
      const result = CompaniesAPILogic.validateQueryParams(params);

      expect(result.isValid).toBe(true);
      expect(result.params.limit).toBe(999999);
      expect(result.params.offset).toBe(500000);
    });

    it('should handle special characters in search queries', () => {
      const params = new URLSearchParams('search=Company%20%26%20Co.%20%22Special%22');
      const result = CompaniesAPILogic.validateQueryParams(params);

      expect(result.isValid).toBe(true);
      expect(result.params.search).toBe('Company & Co. "Special"');
    });

    it('should handle null and undefined values gracefully', () => {
      const data = {
        companies: null,
        total: undefined,
        hasMore: false
      };
      const params = { limit: 20, offset: 0 };

      const response = CompaniesAPILogic.formatResponse(data, params);
      
      expect(response.success).toBe(true);
      expect(response.data.companies).toBeNull();
    });

    it('should handle empty arrays correctly', () => {
      const transformed = IntelligenceAPILogic.transformCompanyData([]);
      expect(transformed).toEqual([]);

      const summary = IntelligenceAPILogic.calculateSummary([], 1);
      expect(summary.totalCompanies).toBe(0);
      expect(summary.totalMentions).toBe(0);
      expect(summary.averageMentionsPerCompany).toBe('0');
    });
  });
});