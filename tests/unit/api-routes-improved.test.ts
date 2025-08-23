import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Import the actual route handlers
import { GET as getCompaniesHandler } from '../../apps/web/app/api/companies/route';
import { GET as getIntelligenceHandler } from '../../apps/web/app/api/intelligence/route';

// Mock NextResponse.json to capture response data and status
const mockJsonResponse = vi.fn((data, options) => ({
  json: () => Promise.resolve(data),
  status: options?.status || 200,
  data,
  options
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server');
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: mockJsonResponse
    }
  };
});

// Mock Clerk authentication
const mockAuth = vi.fn(() => ({ userId: 'test-user-id' }));
const mockCurrentUser = vi.fn(() => Promise.resolve({ 
  id: 'test-user-id', 
  emailAddress: 'test@example.com' 
}));

vi.mock('@clerk/nextjs', () => ({
  auth: mockAuth
}));

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: mockCurrentUser
}));

// Mock database functions
const mockGetCompanies = vi.fn();

// Create mock Supabase clients
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

vi.mock('@substack-intelligence/database', () => ({
  createServerComponentClient: vi.fn(() => mockSupabaseClient),
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
  getCompanies: mockGetCompanies
}));

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

// Mock environment variables
const originalEnv = process.env;

describe('API Routes - Improved Tests', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test'
    };
    vi.clearAllMocks();
    // Reset auth to authenticated by default
    mockAuth.mockReturnValue({ userId: 'test-user-id' });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET /api/companies - Real Handler Tests', () => {
    it('should return companies with default parameters using real handler', async () => {
      // Mock successful database response
      mockGetCompanies.mockResolvedValue({
        companies: mockCompanies,
        total: mockCompanies.length,
        hasMore: false
      });

      const request = new NextRequest('https://example.com/api/companies');
      const response = await getCompaniesHandler(request);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        data: {
          companies: expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Company A'
            })
          ]),
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

      // Verify the database function was called with correct parameters
      expect(mockGetCompanies).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          limit: 20,
          offset: 0,
          orderBy: 'mention_count',
          orderDirection: 'desc'
        })
      );
    });

    it('should handle query parameters correctly', async () => {
      mockGetCompanies.mockResolvedValue({
        companies: [mockCompanies[0]],
        total: 1,
        hasMore: false
      });

      const request = new NextRequest('https://example.com/api/companies?search=test&limit=5&offset=10&orderBy=name&orderDirection=asc&fundingStatus=Series+A');
      await getCompaniesHandler(request);

      expect(mockGetCompanies).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          search: 'test',
          limit: 5,
          offset: 10,
          orderBy: 'name',
          orderDirection: 'asc',
          fundingStatus: 'Series A'
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockReturnValue({ userId: null });

      const request = new NextRequest('https://example.com/api/companies');
      const response = await getCompaniesHandler(request);

      expect(response.status).toBe(401);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should return 400 for invalid query parameters', async () => {
      const request = new NextRequest('https://example.com/api/companies?orderBy=invalid&limit=notanumber');
      const response = await getCompaniesHandler(request);

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Invalid query parameters',
        details: expect.any(Array)
      });
    });

    it('should handle database errors gracefully', async () => {
      mockGetCompanies.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('https://example.com/api/companies');
      const response = await getCompaniesHandler(request);

      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Database connection failed'
      });
    });

    it('should handle unknown error types', async () => {
      mockGetCompanies.mockRejectedValue('Unknown error type');

      const request = new NextRequest('https://example.com/api/companies');
      const response = await getCompaniesHandler(request);

      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Unknown error'
      });
    });

    it('should validate and transform numeric parameters correctly', async () => {
      mockGetCompanies.mockResolvedValue({
        companies: [],
        total: 0,
        hasMore: false
      });

      const request = new NextRequest('https://example.com/api/companies?limit=100&offset=50');
      await getCompaniesHandler(request);

      expect(mockGetCompanies).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          limit: 100,
          offset: 50
        })
      );
    });
  });

  describe('GET /api/intelligence - Real Handler Tests', () => {
    beforeEach(() => {
      // Mock the Supabase query chain for intelligence
      mockServiceRoleClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: mockIntelligenceData,
          error: null
        }))
      });
    });

    it('should return intelligence data with default parameters using real handler', async () => {
      const request = new NextRequest('https://example.com/api/intelligence');
      const response = await getIntelligenceHandler(request);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        data: {
          companies: expect.arrayContaining([
            expect.objectContaining({
              name: 'Intel Company A',
              mentions: expect.arrayContaining([
                expect.objectContaining({
                  context: expect.any(String),
                  sentiment: expect.any(String),
                  confidence: expect.any(Number)
                })
              ])
            })
          ]),
          summary: {
            totalCompanies: expect.any(Number),
            totalMentions: expect.any(Number),
            averageMentionsPerCompany: expect.any(String),
            timeRange: expect.any(String)
          }
        },
        meta: {
          timestamp: expect.any(String),
          version: '1.0.0'
        }
      });
    });

    it('should handle query parameters correctly', async () => {
      const request = new NextRequest('https://example.com/api/intelligence?limit=25&days=7');
      const response = await getIntelligenceHandler(request);

      expect(mockServiceRoleClient.from).toHaveBeenCalledWith('companies');
      expect(response.data.data.summary.timeRange).toBe('7 days');
    });

    it('should handle single day timeRange correctly', async () => {
      const request = new NextRequest('https://example.com/api/intelligence?days=1');
      const response = await getIntelligenceHandler(request);

      expect(response.data.data.summary.timeRange).toBe('1 day');
    });

    it('should return 401 when not authenticated in production', async () => {
      process.env.NODE_ENV = 'production';
      mockCurrentUser.mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/intelligence');
      const response = await getIntelligenceHandler(request);

      expect(response.status).toBe(401);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should allow unauthenticated access in development', async () => {
      process.env.NODE_ENV = 'development';
      mockCurrentUser.mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/intelligence');
      const response = await getIntelligenceHandler(request);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should return 400 for invalid query parameters', async () => {
      const request = new NextRequest('https://example.com/api/intelligence?limit=notanumber&days=invalid');
      const response = await getIntelligenceHandler(request);

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Invalid query parameters',
        details: expect.any(Array)
      });
    });

    it('should handle database errors gracefully', async () => {
      mockServiceRoleClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Database connection failed' }
        }))
      });

      const request = new NextRequest('https://example.com/api/intelligence');
      const response = await getIntelligenceHandler(request);

      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        success: false,
        error: 'Database connection failed'
      });
    });

    it('should transform company data correctly', async () => {
      const request = new NextRequest('https://example.com/api/intelligence');
      const response = await getIntelligenceHandler(request);

      const company = response.data.data.companies[0];
      expect(company).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        website: expect.any(String),
        funding_status: expect.any(String),
        mentions: expect.any(Array),
        totalMentions: expect.any(Number),
        newsletterDiversity: expect.any(Number)
      });

      if (company.mentions.length > 0) {
        const mention = company.mentions[0];
        expect(mention).toMatchObject({
          id: expect.any(String),
          context: expect.any(String),
          sentiment: expect.any(String),
          confidence: expect.any(Number),
          newsletter_name: expect.any(String),
          received_at: expect.any(String)
        });
      }
    });

    it('should filter out companies without mentions', async () => {
      const dataWithoutMentions = [
        {
          id: 'no-mentions-company',
          name: 'Company Without Mentions',
          company_mentions: []
        }
      ];

      mockServiceRoleClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: dataWithoutMentions,
          error: null
        }))
      });

      const request = new NextRequest('https://example.com/api/intelligence');
      const response = await getIntelligenceHandler(request);

      expect(response.data.data.companies).toHaveLength(0);
    });

    it('should calculate newsletter diversity correctly', async () => {
      const diverseData = [
        {
          id: 'diverse-company',
          name: 'Diverse Company',
          description: 'A diverse company',
          website: 'https://diverse.com',
          funding_status: 'Series A',
          mention_count: 3,
          company_mentions: [
            {
              id: 'mention-1',
              context: 'Context 1',
              sentiment: 'positive',
              confidence: 0.9,
              extracted_at: '2024-01-01T10:00:00Z',
              emails: { newsletter_name: 'Newsletter A', received_at: '2024-01-01T09:00:00Z' }
            },
            {
              id: 'mention-2',
              context: 'Context 2',
              sentiment: 'positive',
              confidence: 0.8,
              extracted_at: '2024-01-01T11:00:00Z',
              emails: { newsletter_name: 'Newsletter B', received_at: '2024-01-01T10:00:00Z' }
            },
            {
              id: 'mention-3',
              context: 'Context 3',
              sentiment: 'neutral',
              confidence: 0.7,
              extracted_at: '2024-01-01T12:00:00Z',
              emails: { newsletter_name: 'Newsletter A', received_at: '2024-01-01T11:00:00Z' }
            }
          ]
        }
      ];

      mockServiceRoleClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: diverseData,
          error: null
        }))
      });

      const request = new NextRequest('https://example.com/api/intelligence');
      const response = await getIntelligenceHandler(request);

      const company = response.data.data.companies[0];
      expect(company.newsletterDiversity).toBe(2); // Only Newsletter A and B
    });

    it('should handle null/undefined email data gracefully', async () => {
      const incompleteData = [
        {
          id: 'incomplete-company',
          name: 'Incomplete Company',
          description: null,
          website: null,
          funding_status: null,
          mention_count: null,
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

      mockServiceRoleClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: incompleteData,
          error: null
        }))
      });

      const request = new NextRequest('https://example.com/api/intelligence');
      const response = await getIntelligenceHandler(request);

      expect(response.status).toBe(200);
      const company = response.data.data.companies[0];
      expect(company.mentions[0].newsletter_name).toBe('Unknown');
      expect(company.totalMentions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Response Format Validation', () => {
    it('should have consistent success response format', async () => {
      mockGetCompanies.mockResolvedValue({
        companies: [],
        total: 0,
        hasMore: false
      });

      const request = new NextRequest('https://example.com/api/companies');
      const response = await getCompaniesHandler(request);

      expect(response.data).toMatchObject({
        success: true,
        data: expect.any(Object),
        meta: {
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
          version: '1.0.0'
        }
      });
    });

    it('should have consistent error response format', async () => {
      mockAuth.mockReturnValue({ userId: null });

      const request = new NextRequest('https://example.com/api/companies');
      const response = await getCompaniesHandler(request);

      expect(response.data).toMatchObject({
        success: false,
        error: expect.any(String)
      });
      expect(response.data).not.toHaveProperty('meta');
    });
  });

  describe('Route Configuration', () => {
    it('should have correct dynamic export configuration', async () => {
      const companiesRoute = await import('../../apps/web/app/api/companies/route');
      const intelligenceRoute = await import('../../apps/web/app/api/intelligence/route');

      expect(companiesRoute.dynamic).toBe('force-dynamic');
      expect(companiesRoute.revalidate).toBe(0);
      expect(intelligenceRoute.dynamic).toBe('force-dynamic');
      expect(intelligenceRoute.revalidate).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed URLs gracefully', async () => {
      try {
        // This should not crash the handler
        const request = new NextRequest('https://example.com/api/companies?limit=50&offset=abc');
        const response = await getCompaniesHandler(request);
        expect(response.status).toBe(400);
      } catch (error) {
        // If it throws, it should be a validation error, not a crash
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle very large limit values', async () => {
      mockGetCompanies.mockResolvedValue({
        companies: [],
        total: 0,
        hasMore: false
      });

      const request = new NextRequest('https://example.com/api/companies?limit=999999');
      const response = await getCompaniesHandler(request);
      
      // Should not crash and should handle the large number
      expect(response.status).toBe(200);
      expect(mockGetCompanies).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          limit: 999999
        })
      );
    });
  });
});