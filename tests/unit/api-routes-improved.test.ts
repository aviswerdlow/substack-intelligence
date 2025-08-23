import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

// Mock server-only module first to prevent import errors
vi.mock('server-only', () => ({}));

// Clear any existing mocks from global setup
vi.unmock('@clerk/nextjs');
vi.unmock('@clerk/nextjs/server');
vi.unmock('@substack-intelligence/database');

// Hoist mock functions to make them available in vi.mock
const { mockAuth, mockCurrentUser, mockGetCompanies, mockSupabaseClient, mockServiceRoleClient, mockJsonResponse } = vi.hoisted(() => {
  const auth = vi.fn(() => ({ userId: 'test-user-id' }));
  const currentUser = vi.fn(() => Promise.resolve({ 
    id: 'test-user-id', 
    emailAddress: 'test@example.com' 
  }));
  const getCompanies = vi.fn();
  
  const jsonResponse = vi.fn((data, options) => ({
    json: () => Promise.resolve(data),
    status: options?.status || 200,
    data,
    options
  }));
  
  const supabaseClient = {
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
  
  const serviceRoleClient = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  };
  
  return {
    mockAuth: auth,
    mockCurrentUser: currentUser,
    mockGetCompanies: getCompanies,
    mockSupabaseClient: supabaseClient,
    mockServiceRoleClient: serviceRoleClient,
    mockJsonResponse: jsonResponse
  };
});

// Mock NextResponse.json to capture response data and status
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
vi.mock('@clerk/nextjs', () => ({
  auth: mockAuth
}));

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: mockCurrentUser
}));

// Mock database functions
vi.mock('@substack-intelligence/database', () => ({
  createServerComponentClient: vi.fn(() => mockSupabaseClient),
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
  getCompanies: mockGetCompanies
}));

// Route handlers will be imported dynamically in beforeAll

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
      },
      {
        id: 'mention-2',
        context: 'Company A expands to new markets',
        sentiment: 'positive',
        confidence: 0.88,
        extracted_at: '2024-01-02T10:00:00Z',
        emails: {
          newsletter_name: 'VentureBeat',
          received_at: '2024-01-02T08:00:00Z'
        }
      }
    ]
  },
  {
    id: '789e0123-b456-78c9-0123-456789abcdef',
    name: 'Intel Company B',
    description: 'Another intelligent company',
    website: 'https://intelcompanyb.com',
    funding_status: 'Seed',
    mention_count: 5,
    company_mentions: [
      {
        id: 'mention-3',
        context: 'Company B announces new product',
        sentiment: 'neutral',
        confidence: 0.75,
        extracted_at: '2024-01-01T14:00:00Z',
        emails: {
          newsletter_name: 'ProductHunt',
          received_at: '2024-01-01T12:00:00Z'
        }
      }
    ]
  }
];

// Mock environment variables
const originalEnv = process.env;

describe('API Routes - Improved Tests', () => {
  let getCompaniesHandler: any;
  let getIntelligenceHandler: any;

  beforeAll(async () => {
    // Dynamically import route handlers after mocks are set up
    const companiesRoute = await import('../../apps/web/app/api/companies/route');
    getCompaniesHandler = companiesRoute.GET;
    
    const intelligenceRoute = await import('../../apps/web/app/api/intelligence/route');
    getIntelligenceHandler = intelligenceRoute.GET;
  });

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test'
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET /api/companies - Advanced Scenarios', () => {
    it('should handle complex filter combinations', async () => {
      mockGetCompanies.mockResolvedValue({
        companies: [mockCompanies[0]],
        total: 1,
        hasMore: false
      });

      const request = new NextRequest('https://example.com/api/companies?search=test&fundingStatus=Series%20A&orderBy=mention_count&orderDirection=desc&limit=5&offset=0');
      
      await getCompaniesHandler(request);

      expect(mockGetCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'test',
          fundingStatus: 'Series A',
          orderBy: 'mention_count',
          orderDirection: 'desc',
          limit: 5,
          offset: 0
        })
      );
    });

    it('should handle special characters in search query', async () => {
      mockGetCompanies.mockResolvedValue({
        companies: [],
        total: 0,
        hasMore: false
      });

      const request = new NextRequest('https://example.com/api/companies?search=%40%23%24%25%5E%26*()');
      
      const response = await getCompaniesHandler(request);
      const responseData = response.data;

      expect(responseData.success).toBe(true);
      expect(mockGetCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '@#$%^&*()'
        })
      );
    });

    it('should handle pagination edge cases', async () => {
      mockGetCompanies.mockResolvedValue({
        companies: [],
        total: 100,
        hasMore: true
      });

      const request = new NextRequest('https://example.com/api/companies?limit=1000&offset=999999');
      
      const response = await getCompaniesHandler(request);
      const responseData = response.data;

      expect(responseData.success).toBe(true);
      expect(responseData.data.companies).toEqual([]);
      expect(responseData.data.meta.hasMore).toBe(true);
    });

    it('should handle invalid enum values for orderBy', async () => {
      const request = new NextRequest('https://example.com/api/companies?orderBy=invalid_field');
      
      const response = await getCompaniesHandler(request);

      // Should use default orderBy value
      expect(mockGetCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: 'mention_count'
        })
      );
    });

    it('should handle negative offset values', async () => {
      mockGetCompanies.mockResolvedValue({
        companies: mockCompanies,
        total: 2,
        hasMore: false
      });

      const request = new NextRequest('https://example.com/api/companies?offset=-10');
      
      const response = await getCompaniesHandler(request);
      const responseData = response.data;

      expect(responseData.success).toBe(true);
      // Should treat negative offset as 0
      expect(mockGetCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 0
        })
      );
    });

    it('should handle concurrent requests correctly', async () => {
      mockGetCompanies.mockResolvedValue({
        companies: mockCompanies,
        total: 2,
        hasMore: false
      });

      const requests = Array(5).fill(null).map((_, i) => 
        new NextRequest(`https://example.com/api/companies?offset=${i * 10}`)
      );

      const responses = await Promise.all(
        requests.map(req => getCompaniesHandler(req))
      );

      expect(responses).toHaveLength(5);
      expect(mockGetCompanies).toHaveBeenCalledTimes(5);
    });

    it('should handle database connection pool exhaustion', async () => {
      mockGetCompanies.mockRejectedValue(new Error('Connection pool exhausted'));

      const request = new NextRequest('https://example.com/api/companies');
      
      const response = await getCompaniesHandler(request);
      const responseData = response.data;

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Connection pool exhausted');
    });

    it('should handle null values in company data', async () => {
      mockGetCompanies.mockResolvedValue({
        companies: [{
          ...mockCompanies[0],
          description: null,
          website: null,
          funding_status: null
        }],
        total: 1,
        hasMore: false
      });

      const request = new NextRequest('https://example.com/api/companies');
      
      const response = await getCompaniesHandler(request);
      const responseData = response.data;

      expect(responseData.success).toBe(true);
      expect(responseData.data.companies[0]).toHaveProperty('description', null);
      expect(responseData.data.companies[0]).toHaveProperty('website', null);
    });
  });

  describe('GET /api/intelligence - Advanced Scenarios', () => {
    beforeEach(() => {
      // Reset the mock for each test
      mockServiceRoleClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: mockIntelligenceData,
          error: null
        }))
      }));
    });

    it('should handle large date ranges', async () => {
      const request = new NextRequest('https://example.com/api/intelligence?days=365');
      
      const response = await getIntelligenceHandler(request);
      const responseData = response.data;

      expect(responseData.success).toBe(true);
      expect(responseData.data.summary.timeRange).toBe('365 days');
    });

    it('should handle zero day range', async () => {
      const request = new NextRequest('https://example.com/api/intelligence?days=0');
      
      const response = await getIntelligenceHandler(request);
      const responseData = response.data;

      expect(responseData.success).toBe(true);
      // Should default to 1 day minimum
      expect(responseData.data.summary.timeRange).toBe('1 day');
    });

    it('should calculate averages correctly with multiple companies', async () => {
      const request = new NextRequest('https://example.com/api/intelligence');
      
      const response = await getIntelligenceHandler(request);
      const responseData = response.data;

      expect(responseData.success).toBe(true);
      expect(responseData.data.summary.totalCompanies).toBe(2);
      expect(responseData.data.summary.totalMentions).toBe(17); // 12 + 5
      expect(responseData.data.summary.averageMentionsPerCompany).toBe('8.5');
    });

    it('should handle companies with empty mention arrays', async () => {
      mockServiceRoleClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: [
            {
              ...mockIntelligenceData[0],
              company_mentions: []
            }
          ],
          error: null
        }))
      }));

      const request = new NextRequest('https://example.com/api/intelligence');
      
      const response = await getIntelligenceHandler(request);
      const responseData = response.data;

      expect(responseData.success).toBe(true);
      // Should filter out companies without mentions
      expect(responseData.data.companies).toHaveLength(0);
    });

    it('should handle mentions without email data', async () => {
      mockServiceRoleClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: [{
            ...mockIntelligenceData[0],
            company_mentions: [{
              id: 'mention-no-email',
              context: 'Test context',
              sentiment: 'positive',
              confidence: 0.9,
              extracted_at: '2024-01-01T10:00:00Z',
              emails: null
            }]
          }],
          error: null
        }))
      }));

      const request = new NextRequest('https://example.com/api/intelligence');
      
      const response = await getIntelligenceHandler(request);
      const responseData = response.data;

      expect(responseData.success).toBe(true);
      const mention = responseData.data.companies[0].mentions[0];
      expect(mention.newsletter_name).toBe('Unknown');
      expect(mention.received_at).toBe('2024-01-01T10:00:00Z');
    });

    it('should handle database query timeout', async () => {
      mockServiceRoleClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.reject(new Error('Query timeout')))
      }));

      const request = new NextRequest('https://example.com/api/intelligence');
      
      const response = await getIntelligenceHandler(request);
      const responseData = response.data;

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Query timeout');
    });

    it('should handle newsletter diversity calculation edge cases', async () => {
      mockServiceRoleClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: [{
            id: 'diversity-test',
            name: 'Diversity Test Company',
            mention_count: 5,
            company_mentions: [
              { emails: { newsletter_name: 'Newsletter A' } },
              { emails: { newsletter_name: 'Newsletter A' } },
              { emails: { newsletter_name: null } },
              { emails: null },
              { emails: { newsletter_name: 'Newsletter B' } }
            ]
          }],
          error: null
        }))
      }));

      const request = new NextRequest('https://example.com/api/intelligence');
      
      const response = await getIntelligenceHandler(request);
      const responseData = response.data;

      expect(responseData.success).toBe(true);
      // Should only count unique non-null newsletter names
      expect(responseData.data.companies[0].newsletterDiversity).toBe(2);
    });

    it('should handle very large limit values', async () => {
      const request = new NextRequest('https://example.com/api/intelligence?limit=10000');
      
      const response = await getIntelligenceHandler(request);
      const responseData = response.data;

      expect(responseData.success).toBe(true);
      expect(mockServiceRoleClient.from().limit).toHaveBeenCalledWith(10000);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle non-Error objects thrown by database', async () => {
      mockGetCompanies.mockRejectedValue('String error');

      const request = new NextRequest('https://example.com/api/companies');
      
      const response = await getCompaniesHandler(request);
      const responseData = response.data;

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle undefined errors', async () => {
      mockGetCompanies.mockRejectedValue(undefined);

      const request = new NextRequest('https://example.com/api/companies');
      
      const response = await getCompaniesHandler(request);
      const responseData = response.data;

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle auth errors in production mode', async () => {
      process.env.NODE_ENV = 'production';
      mockAuth.mockReturnValueOnce({ userId: null });

      const request = new NextRequest('https://example.com/api/companies');
      
      const response = await getCompaniesHandler(request);
      const responseData = response.data;

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should handle malformed request URLs', async () => {
      const request = new NextRequest('https://example.com/api/companies?limit=abc&offset=xyz');
      
      const response = await getCompaniesHandler(request);
      const responseData = response.data;

      // Should use default values for invalid parameters
      expect(responseData.success).toBe(true);
      expect(mockGetCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20, // default
          offset: 0  // default
        })
      );
    });
  });

  describe('Response Metadata', () => {
    it('should include proper timestamp in responses', async () => {
      mockGetCompanies.mockResolvedValue({
        companies: mockCompanies,
        total: 2,
        hasMore: false
      });

      const request = new NextRequest('https://example.com/api/companies');
      
      const response = await getCompaniesHandler(request);
      const responseData = response.data;

      expect(responseData.meta).toHaveProperty('timestamp');
      expect(new Date(responseData.meta.timestamp).toISOString()).toBe(responseData.meta.timestamp);
    });

    it('should include version information', async () => {
      mockGetCompanies.mockResolvedValue({
        companies: mockCompanies,
        total: 2,
        hasMore: false
      });

      const request = new NextRequest('https://example.com/api/companies');
      
      const response = await getCompaniesHandler(request);
      const responseData = response.data;

      expect(responseData.meta).toHaveProperty('version', '1.0.0');
    });

    it('should not include meta in error responses', async () => {
      mockAuth.mockReturnValueOnce({ userId: null });

      const request = new NextRequest('https://example.com/api/companies');
      
      const response = await getCompaniesHandler(request);
      const responseData = response.data;

      expect(responseData).not.toHaveProperty('meta');
      expect(responseData).toHaveProperty('error');
    });
  });
});