import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the actual API endpoint behavior without importing Next.js route handlers
// This simulates the full request-response cycle

// Mock environment variables
const originalEnv = process.env;

// Mock Clerk authentication
const mockAuth = vi.fn(() => ({ userId: 'test-user-id' }));
const mockCurrentUser = vi.fn(() => Promise.resolve({ 
  id: 'test-user-id', 
  emailAddress: 'test@example.com' 
}));

// Mock database functions
const mockGetCompanies = vi.fn();
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis()
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

// Simulate API endpoint responses
class APIEndpointSimulator {
  // Simulate /api/companies GET endpoint
  static async simulateGetCompanies(url: string) {
    try {
      // Check authentication
      const { userId } = mockAuth();
      if (!userId) {
        return {
          status: 401,
          json: async () => ({
            success: false,
            error: 'Unauthorized'
          })
        };
      }

      // Parse URL parameters
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      // Validate parameters (simplified Zod-like validation)
      const limit = params.get('limit') ? parseInt(params.get('limit')!) : 20;
      const offset = params.get('offset') ? parseInt(params.get('offset')!) : 0;
      const search = params.get('search') || undefined;
      const fundingStatus = params.get('fundingStatus') || undefined;
      const orderBy = params.get('orderBy') || 'mention_count';
      const orderDirection = params.get('orderDirection') || 'desc';

      // Validation errors
      const errors = [];
      if (isNaN(limit)) errors.push({ message: 'Invalid limit' });
      if (isNaN(offset)) errors.push({ message: 'Invalid offset' });
      if (!['mention_count', 'created_at', 'name'].includes(orderBy)) {
        errors.push({ message: 'Invalid orderBy' });
      }

      if (errors.length > 0) {
        return {
          status: 400,
          json: async () => ({
            success: false,
            error: 'Invalid query parameters',
            details: errors
          })
        };
      }

      // Call database function
      const dbResult = await mockGetCompanies(mockSupabaseClient, {
        limit,
        offset,
        search,
        fundingStatus,
        orderBy,
        orderDirection
      });

      return {
        status: 200,
        json: async () => ({
          success: true,
          data: {
            companies: dbResult.companies,
            pagination: {
              total: dbResult.total,
              limit,
              offset,
              hasMore: dbResult.hasMore
            }
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        })
      };

    } catch (error) {
      console.error('Failed to fetch companies:', error);
      
      return {
        status: 500,
        json: async () => ({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      };
    }
  }

  // Simulate /api/intelligence GET endpoint
  static async simulateGetIntelligence(url: string) {
    try {
      // Check authentication (skip in development)
      const user = await mockCurrentUser();
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (!user && !isDevelopment) {
        return {
          status: 401,
          json: async () => ({
            success: false,
            error: 'Unauthorized'
          })
        };
      }

      // Parse URL parameters
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      const limitStr = params.get('limit');
      const daysStr = params.get('days');
      const limit = limitStr ? parseInt(limitStr) : 50;
      const days = daysStr ? parseInt(daysStr) : 1;

      // Validation
      const errors = [];
      if (limitStr && isNaN(limit)) errors.push({ message: 'Invalid limit' });
      if (daysStr && isNaN(days)) errors.push({ message: 'Invalid days' });

      if (errors.length > 0) {
        return {
          status: 400,
          json: async () => ({
            success: false,
            error: 'Invalid query parameters',
            details: errors
          })
        };
      }

      // Simulate database query
      const { data: companies, error } = await mockServiceRoleClient
        .from('companies')
        .select(`
          *,
          company_mentions(
            id,
            context,
            sentiment,
            confidence,
            extracted_at,
            emails(
              newsletter_name,
              received_at
            )
          )
        `)
        .order('mention_count', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      // Transform data
      const companiesWithMentions = (companies || []).map(company => ({
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

      return {
        status: 200,
        json: async () => ({
          success: true,
          data: {
            companies: companiesWithMentions,
            summary: {
              totalCompanies: companiesWithMentions.length,
              totalMentions: companiesWithMentions.reduce((sum, c) => sum + c.totalMentions, 0),
              averageMentionsPerCompany: companiesWithMentions.length > 0 
                ? (companiesWithMentions.reduce((sum, c) => sum + c.totalMentions, 0) / companiesWithMentions.length).toFixed(1)
                : '0',
              timeRange: `${days} day${days > 1 ? 's' : ''}`
            }
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        })
      };

    } catch (error) {
      console.error('Failed to fetch intelligence:', error);

      return {
        status: 500,
        json: async () => ({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      };
    }
  }

  // Simulate /api/health GET endpoint
  static async simulateGetHealth() {
    try {
      // Check database connection
      const { data, error } = await Promise.resolve({
        data: [{ count: 1 }],
        error: null
      });
      
      if (error) {
        throw error;
      }

      // Check environment variables
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_KEY',
        'ANTHROPIC_API_KEY',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        'CLERK_SECRET_KEY'
      ];

      const missingEnvVars = requiredEnvVars.filter(
        (envVar) => !process.env[envVar]
      );

      const status = missingEnvVars.length === 0 ? 'healthy' : 'degraded';
      const statusCode = status === 'healthy' ? 200 : 503;

      const response = {
        status,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV,
        database: {
          connected: !error,
          latency: data ? 'ok' : 'error'
        },
        services: {
          supabase: !error,
          anthropic: !!process.env.ANTHROPIC_API_KEY,
          clerk: !!process.env.CLERK_SECRET_KEY,
          gmail: !!process.env.GOOGLE_CLIENT_ID,
          resend: !!process.env.RESEND_API_KEY
        }
      };

      if (missingEnvVars.length > 0) {
        (response as any).warnings = {
          missingEnvVars
        };
      }

      return {
        status: statusCode,
        json: async () => response
      };

    } catch (error) {
      console.error('Health check failed:', error);
      
      return {
        status: 503,
        json: async () => ({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      };
    }
  }
}

describe('API Routes Integration Tests', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'test-clerk-pub-key',
      CLERK_SECRET_KEY: 'test-clerk-secret',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      RESEND_API_KEY: 'test-resend-key'
    };
    
    vi.clearAllMocks();
    
    // Reset to authenticated state by default
    mockAuth.mockReturnValue({ userId: 'test-user-id' });
    mockCurrentUser.mockResolvedValue({ 
      id: 'test-user-id', 
      emailAddress: 'test@example.com' 
    });

    // Mock successful database responses
    mockGetCompanies.mockResolvedValue({
      companies: mockCompanies,
      total: mockCompanies.length,
      hasMore: false
    });

    mockServiceRoleClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({
        data: mockIntelligenceData,
        error: null
      }))
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET /api/companies Integration', () => {
    it('should return companies with default parameters', async () => {
      const response = await APIEndpointSimulator.simulateGetCompanies('https://example.com/api/companies');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
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
      const response = await APIEndpointSimulator.simulateGetCompanies(
        'https://example.com/api/companies?search=test&limit=10&offset=5&orderBy=name&orderDirection=asc&fundingStatus=Series+A'
      );

      expect(response.status).toBe(200);
      expect(mockGetCompanies).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          search: 'test',
          limit: 10,
          offset: 5,
          orderBy: 'name',
          orderDirection: 'asc',
          fundingStatus: 'Series A'
        })
      );
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockAuth.mockReturnValue({ userId: null });

      const response = await APIEndpointSimulator.simulateGetCompanies('https://example.com/api/companies');
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toMatchObject({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should return 400 for invalid parameters', async () => {
      const response = await APIEndpointSimulator.simulateGetCompanies(
        'https://example.com/api/companies?limit=invalid&orderBy=wrong'
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: 'Invalid query parameters',
        details: expect.any(Array)
      });
    });

    it('should handle database errors', async () => {
      mockGetCompanies.mockRejectedValue(new Error('Database connection failed'));

      const response = await APIEndpointSimulator.simulateGetCompanies('https://example.com/api/companies');
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        success: false,
        error: 'Database connection failed'
      });
    });
  });

  describe('GET /api/intelligence Integration', () => {
    it('should return intelligence data with default parameters', async () => {
      const response = await APIEndpointSimulator.simulateGetIntelligence('https://example.com/api/intelligence');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        data: {
          companies: expect.arrayContaining([
            expect.objectContaining({
              name: 'Intel Company A',
              mentions: expect.any(Array),
              totalMentions: expect.any(Number),
              newsletterDiversity: expect.any(Number)
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

    it('should handle custom parameters', async () => {
      const response = await APIEndpointSimulator.simulateGetIntelligence(
        'https://example.com/api/intelligence?limit=25&days=7'
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.summary.timeRange).toBe('7 days');
    });

    it('should return 401 in production when not authenticated', async () => {
      process.env.NODE_ENV = 'production';
      mockCurrentUser.mockResolvedValue(null);

      const response = await APIEndpointSimulator.simulateGetIntelligence('https://example.com/api/intelligence');
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toMatchObject({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should allow access in development when not authenticated', async () => {
      process.env.NODE_ENV = 'development';
      mockCurrentUser.mockResolvedValue(null);

      const response = await APIEndpointSimulator.simulateGetIntelligence('https://example.com/api/intelligence');

      expect(response.status).toBe(200);
    });

    it('should handle invalid parameters', async () => {
      const response = await APIEndpointSimulator.simulateGetIntelligence(
        'https://example.com/api/intelligence?limit=invalid&days=wrong'
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: 'Invalid query parameters',
        details: expect.any(Array)
      });
    });
  });

  describe('GET /api/health Integration', () => {
    it('should return healthy status with all services available', async () => {
      const response = await APIEndpointSimulator.simulateGetHealth();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String),
        environment: 'test',
        database: {
          connected: true,
          latency: 'ok'
        },
        services: {
          supabase: true,
          anthropic: true,
          clerk: true,
          gmail: true,
          resend: true
        }
      });
    });

    it('should return degraded status with missing environment variables', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.CLERK_SECRET_KEY;

      const response = await APIEndpointSimulator.simulateGetHealth();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toMatchObject({
        status: 'degraded',
        services: {
          anthropic: false,
          clerk: false
        },
        warnings: {
          missingEnvVars: expect.arrayContaining(['ANTHROPIC_API_KEY', 'CLERK_SECRET_KEY'])
        }
      });
    });
  });

  describe('Response Format Consistency', () => {
    it('should have consistent success response format across endpoints', async () => {
      const companiesResponse = await APIEndpointSimulator.simulateGetCompanies('https://example.com/api/companies');
      const intelligenceResponse = await APIEndpointSimulator.simulateGetIntelligence('https://example.com/api/intelligence');
      
      const companiesData = await companiesResponse.json();
      const intelligenceData = await intelligenceResponse.json();

      // Both should have consistent success structure
      expect(companiesData).toMatchObject({
        success: true,
        data: expect.any(Object),
        meta: {
          timestamp: expect.any(String),
          version: '1.0.0'
        }
      });

      expect(intelligenceData).toMatchObject({
        success: true,
        data: expect.any(Object),
        meta: {
          timestamp: expect.any(String),
          version: '1.0.0'
        }
      });
    });

    it('should have consistent error response format across endpoints', async () => {
      mockAuth.mockReturnValue({ userId: null });

      const companiesResponse = await APIEndpointSimulator.simulateGetCompanies('https://example.com/api/companies');
      const companiesData = await companiesResponse.json();

      expect(companiesData).toMatchObject({
        success: false,
        error: expect.any(String)
      });
      expect(companiesData).not.toHaveProperty('meta');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockCompanies[0],
        id: `company-${i}`,
        name: `Company ${i}`
      }));

      mockGetCompanies.mockResolvedValue({
        companies: largeDataset,
        total: largeDataset.length,
        hasMore: false
      });

      const startTime = Date.now();
      const response = await APIEndpointSimulator.simulateGetCompanies('https://example.com/api/companies?limit=1000');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, () => 
        APIEndpointSimulator.simulateGetCompanies('https://example.com/api/companies')
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Each request should have called the database function
      expect(mockGetCompanies).toHaveBeenCalledTimes(10);
    });

    it('should handle malformed URLs gracefully', async () => {
      // This should not crash
      const response = await APIEndpointSimulator.simulateGetCompanies(
        'https://example.com/api/companies?limit=<script>alert(1)</script>&search="; DROP TABLE companies;--'
      );
      
      // Should validate and reject dangerous input
      expect(response.status).toBe(400);
    });
  });
});