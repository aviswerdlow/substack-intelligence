import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

// Mock server-only module first to prevent import errors
vi.mock('server-only', () => ({}));

// Import centralized mock utilities
import { createMockNextRequest } from '../mocks/nextjs/server';
import { clerkMocks } from '../mocks/auth/clerk';
import { databaseQueryMocks } from '../mocks/database/queries';

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
      }
    ]
  }
];

// Mock environment variables
const originalEnv = process.env;

describe('API Routes', () => {
  let getCompanies: any;
  let getIntelligence: any;

  beforeAll(async () => {
    try {
      // Dynamically import route handlers after mocks are set up
      const companiesRoute = await import('../../apps/web/app/api/companies/route');
      getCompanies = companiesRoute.GET;
      
      const intelligenceRoute = await import('../../apps/web/app/api/intelligence/route');
      getIntelligence = intelligenceRoute.GET;
      
      if (!getCompanies || !getIntelligence) {
        throw new Error('Failed to import route handlers');
      }
    } catch (error) {
      console.error('Error importing route handlers:', error);
      throw error;
    }
  });

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test'
    };
    vi.clearAllMocks();
    
    // Reset centralized mocks to default state
    clerkMocks.resetAllMocks();
    databaseQueryMocks.resetAllMocks();
    
    // Configure default authenticated user
    clerkMocks.mockSignedInUser({
      id: 'test-user-id',
      emailAddress: 'test@example.com'
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET /api/companies', () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
      mockRequest = createMockNextRequest('https://example.com/api/companies');
      
      // Configure the getCompanies mock using centralized database mocks
      databaseQueryMocks.mockResolvedValue('getCompanies', {
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
            }),
            expect.objectContaining({
              name: 'Test Company B'
            })
          ]),
          meta: {
            total: 2,
            hasMore: false
          }
        }
      });
    });

    it('should apply pagination parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/companies?limit=10&offset=20');

      await getCompanies(mockRequest);

      expect(databaseQueryMocks.getCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20
        })
      );
    });

    it('should apply search filter', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/companies?search=test');

      await getCompanies(mockRequest);

      expect(databaseQueryMocks.getCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'test'
        })
      );
    });

    it('should apply funding status filter', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/companies?fundingStatus=Series%20A');

      await getCompanies(mockRequest);

      expect(databaseQueryMocks.getCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          fundingStatus: 'Series A'
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      clerkMocks.auth.mockReturnValueOnce({ userId: null });

      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should handle empty result set', async () => {
      databaseQueryMocks.mockResolvedValue('getCompanies', {
        companies: [],
        total: 0,
        hasMore: false
      });

      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(responseData).toMatchObject({
        success: true,
        data: {
          companies: [],
          meta: {
            total: 0,
            hasMore: false
          }
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      databaseQueryMocks.mockRejectedValue('getCompanies', new Error('Database connection failed'));

      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Database connection failed'
      });
    });

    it('should apply ordering parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/companies?orderBy=created_at&orderDirection=asc');

      await getCompanies(mockRequest);

      expect(databaseQueryMocks.getCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: 'created_at',
          orderDirection: 'asc'
        })
      );
    });

    it('should use default ordering when not specified', async () => {
      await getCompanies(mockRequest);

      expect(databaseQueryMocks.getCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
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
      mockServiceClient.from = vi.fn(() => ({
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

    it('should handle single day timeRange', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence?days=1');

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.summary.timeRange).toBe('1 day');
    });

    it('should handle multi-day timeRange', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence?days=7');

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.summary.timeRange).toBe('7 days');
    });

    it('should return 401 when not authenticated in production', async () => {
      process.env.NODE_ENV = 'production';
      clerkMocks.currentUser.mockResolvedValueOnce(null);

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
      clerkMocks.currentUser.mockResolvedValueOnce(null);

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
      expect(company).toHaveProperty('description');
      expect(company).toHaveProperty('website');
      expect(company).toHaveProperty('funding_status');
      expect(company).toHaveProperty('mentions');
      expect(company).toHaveProperty('totalMentions');
      expect(company).toHaveProperty('newsletterDiversity');
    });

    it('should calculate summary statistics correctly', async () => {
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.summary).toMatchObject({
        totalCompanies: 1,
        totalMentions: 12,
        averageMentionsPerCompany: '12.0',
        timeRange: '1 day'
      });
    });

    it('should filter out companies without mentions', async () => {
      mockServiceClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: [
            ...mockIntelligenceData,
            {
              id: 'no-mentions-company',
              name: 'No Mentions Company',
              company_mentions: []
            }
          ],
          error: null
        }))
      }));

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.companies.length).toBe(1);
      expect(responseData.data.companies[0].name).toBe('Intel Company A');
    });

    it('should calculate newsletter diversity correctly', async () => {
      const testData = [{
        id: 'diversity-test',
        name: 'Diversity Test Company',
        mention_count: 3,
        company_mentions: [
          { emails: { newsletter_name: 'Newsletter A' } },
          { emails: { newsletter_name: 'Newsletter B' } },
          { emails: { newsletter_name: 'Newsletter A' } }
        ]
      }];

      mockServiceClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: testData,
          error: null
        }))
      }));

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.companies[0].newsletterDiversity).toBe(2);
    });

    it('should return 400 for invalid query parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence?days=invalid');

      const response = await getIntelligence(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should handle limit parameter', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence?limit=25');

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });

    it('should handle empty mentions array', async () => {
      mockServiceClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: [{
            id: 'empty-mentions',
            name: 'Empty Mentions Company',
            company_mentions: []
          }],
          error: null
        }))
      }));

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.success).toBe(true);
      expect(responseData.data.companies[0].mentions).toEqual([]);
    });

    it('should use default values for null parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence?limit=&days=');

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });
  });

  describe('Response Format', () => {
    it('should have consistent response format for success', async () => {
      const mockRequest = createMockNextRequest('https://example.com/api/companies');
      
      databaseQueryMocks.mockResolvedValue('getCompanies', {
        companies: mockCompanies,
        total: mockCompanies.length,
        hasMore: false
      });

      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');
      expect(responseData).toHaveProperty('meta');
      expect(responseData.meta).toHaveProperty('timestamp');
      expect(responseData.meta).toHaveProperty('version');
    });

    it('should have consistent response format for errors', async () => {
      const mockRequest = createMockNextRequest('https://example.com/api/companies');
      
      clerkMocks.auth.mockReturnValueOnce({ userId: null });

      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
      expect(responseData).not.toHaveProperty('data');
    });
  });
});