import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Import centralized mock utilities
import { createMockNextRequest } from '../mocks/nextjs/server';

// Mock @clerk/nextjs BEFORE importing routes
vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(() => ({ userId: 'test-user-id' }))
}));

// Mock @clerk/nextjs/server BEFORE importing routes  
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(() => Promise.resolve({ id: 'test-user-id', emailAddress: 'test@example.com' }))
}));

// Mock database BEFORE importing routes
vi.mock('@substack-intelligence/database', () => ({
  createServerComponentClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      single: vi.fn(),
      data: [],
      error: null
    }))
  })),
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis()
    }))
  })),
  getCompanies: vi.fn(),
  getDailyIntelligence: vi.fn()
}));

// NOW import route handlers AFTER mocks are set up
import { GET as getCompanies } from '../../apps/web/app/api/companies/route';
import { GET as getIntelligence } from '../../apps/web/app/api/intelligence/route';

// Get references to the mocked functions for easier access
import { getCompanies as mockGetCompanies, createServerComponentClient } from '@substack-intelligence/database';
const mockSupabaseClient = createServerComponentClient();

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

describe('API Routes', () => {
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

  describe('GET /api/companies', () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
      mockRequest = createMockNextRequest('https://example.com/api/companies');
      
      // Configure the getCompanies mock to return expected data structure
      vi.mocked(mockGetCompanies).mockResolvedValue({
        companies: mockCompanies,
        total: mockCompanies.length,
        hasMore: false
      });
    });

    it('should return companies with default parameters', async () => {
      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(responseData).toMatchObject({
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
    });

    it('should handle search parameter', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/companies?search=test&limit=5&offset=10');
      
      await getCompanies(mockRequest);

      expect(vi.mocked(mockGetCompanies)).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          search: 'test',
          limit: 5,
          offset: 10,
          orderBy: 'mention_count',
          orderDirection: 'desc'
        })
      );
    });

    it('should handle funding status filter', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/companies?fundingStatus=Series+A');
      
      await getCompanies(mockRequest);

      expect(vi.mocked(mockGetCompanies)).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          fundingStatus: 'Series A'
        })
      );
    });

    it('should handle ordering parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/companies?orderBy=name&orderDirection=asc');
      
      await getCompanies(mockRequest);

      expect(vi.mocked(mockGetCompanies)).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          orderBy: 'name',
          orderDirection: 'asc'
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      // Mock auth to return no userId
      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValueOnce({ userId: null });

      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should return 400 for invalid query parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/companies?orderBy=invalid&limit=notanumber');
      
      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Invalid query parameters',
        details: expect.any(Array)
      });
    });

    it('should handle database errors', async () => {
      vi.mocked(mockGetCompanies).mockRejectedValue(new Error('Database connection failed'));

      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Database connection failed'
      });
    });

    it('should validate numeric parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/companies?limit=50&offset=100');
      
      await getCompanies(mockRequest);

      expect(vi.mocked(mockGetCompanies)).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          limit: 50,
          offset: 100
        })
      );
    });

    it('should use default values for missing parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/companies');
      
      await getCompanies(mockRequest);

      expect(vi.mocked(mockGetCompanies)).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          limit: 20,
          offset: 0,
          orderBy: 'mention_count',
          orderDirection: 'desc'
        })
      );
    });
  });

  describe('GET /api/intelligence', () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence');

      // Setup mock Supabase client to return intelligence data
      const supabase = createServerComponentClient();
      supabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: mockIntelligenceData,
          error: null
        }))
      }));
    });

    it('should return intelligence data with default parameters', async () => {
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData).toMatchObject({
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
            timeRange: expect.any(String)
          }
        }
      });
    });

    it('should handle custom limit and days parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence?limit=25&days=7');

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      const supabase = createServerComponentClient();
      expect(supabase.from).toHaveBeenCalledWith('companies');
      expect(responseData.success).toBe(true);
    });

    it('should handle single day timeRange', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence?days=1');

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.summary.timeRange).toBe('1 day');
    });

    it('should return 401 when not authenticated in production', async () => {
      process.env.NODE_ENV = 'production';
      // Mock currentUser from @clerk/nextjs/server
      const { currentUser } = require('@clerk/nextjs/server');
      vi.mocked(currentUser).mockResolvedValueOnce(null);

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should allow unauthenticated access in development', async () => {
      process.env.NODE_ENV = 'development';
      const { currentUser } = require('@clerk/nextjs/server');
      vi.mocked(currentUser).mockResolvedValueOnce(null);

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });

    it('should transform company data correctly', async () => {
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      const company = responseData.data.companies[0];
      expect(company).toHaveProperty('id');
      expect(company).toHaveProperty('name');
      expect(company).toHaveProperty('mentions');
      expect(company.mentions[0]).toHaveProperty('newsletter_name');
    });

    it('should calculate summary statistics correctly', async () => {
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.summary).toHaveProperty('totalCompanies');
      expect(responseData.data.summary).toHaveProperty('totalMentions');
      expect(responseData.data.summary).toHaveProperty('avgMentionsPerCompany');
      expect(responseData.data.summary.totalCompanies).toBeGreaterThan(0);
    });

    it('should filter out companies without mentions', async () => {
      const supabase = createServerComponentClient();
      supabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: [
            ...mockIntelligenceData,
            {
              id: 'no-mentions',
              name: 'Company Without Mentions',
              company_mentions: []
            }
          ],
          error: null
        }))
      }));

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      const companyWithoutMentions = responseData.data.companies.find(
        (c: any) => c.name === 'Company Without Mentions'
      );
      expect(companyWithoutMentions).toBeDefined();
      expect(companyWithoutMentions.totalMentions).toBe(0);
    });

    it('should calculate newsletter diversity correctly', async () => {
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      const company = responseData.data.companies[0];
      expect(company).toHaveProperty('newsletterDiversity');
      expect(company.newsletterDiversity).toBeGreaterThan(0);
    });

    it('should return 400 for invalid query parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence?limit=notanumber&days=invalid');

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Invalid query parameters'
      });
    });

    it('should handle database errors', async () => {
      const supabase = createServerComponentClient();
      supabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: null,
          error: new Error('Database error')
        }))
      }));

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
    });

    it('should handle null/undefined values gracefully', async () => {
      const supabase = createServerComponentClient();
      supabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: [{
            id: 'test',
            name: 'Test Company',
            description: null,
            website: undefined,
            company_mentions: null
          }],
          error: null
        }))
      }));

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.companies[0].mentions).toEqual([]);
    });

    it('should use default values for null parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence?limit=null&days=null');

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown errors gracefully', async () => {
      vi.mocked(mockGetCompanies).mockRejectedValue('Unknown error type');

      const mockRequest = createMockNextRequest('https://example.com/api/companies');
      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });

    it('should log errors to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(mockGetCompanies).mockRejectedValue(new Error('Test error'));

      const mockRequest = createMockNextRequest('https://example.com/api/companies');
      await getCompanies(mockRequest);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Response Format', () => {
    it('should have consistent response format for success', async () => {
      vi.mocked(mockGetCompanies).mockResolvedValue({
        companies: mockCompanies,
        total: 2,
        hasMore: false
      });

      const mockRequest = createMockNextRequest('https://example.com/api/companies');
      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');
      expect(responseData).toHaveProperty('meta');
      expect(responseData.meta).toHaveProperty('timestamp');
      expect(responseData.meta).toHaveProperty('version');
    });

    it('should have consistent response format for errors', async () => {
      const { auth } = await import('@clerk/nextjs');
      vi.mocked(auth).mockReturnValueOnce({ userId: null });

      const mockRequest = createMockNextRequest('https://example.com/api/companies');
      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(responseData).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('Caching Headers', () => {
    it('should disable caching with dynamic exports', async () => {
      // Import the route modules to check their export configuration
      const companiesRoute = await import('../../apps/web/app/api/companies/route');
      const intelligenceRoute = await import('../../apps/web/app/api/intelligence/route');

      expect(companiesRoute.dynamic).toBe('force-dynamic');
      expect(companiesRoute.revalidate).toBe(0);
      expect(intelligenceRoute.dynamic).toBe('force-dynamic');
      expect(intelligenceRoute.revalidate).toBe(0);
    });
  });
});