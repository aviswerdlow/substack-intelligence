import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Import route handlers to test
import { GET as getCompanies } from '../../apps/web/app/api/companies/route';
import { GET as getIntelligence } from '../../apps/web/app/api/intelligence/route';

// Import centralized mock utilities
import { createMockNextRequest } from '../mocks/nextjs/server';

// Import database functions for mocking (these will be mocked by setup)
import * as databaseFunctions from '@substack-intelligence/database';

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
    globalThis.testUtils.resetAllTestMocks();
    
    // Setup authenticated user by default
    globalThis.testUtils.mockSuccessfulAuth();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET /api/companies', () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
      mockRequest = createMockNextRequest('https://example.com/api/companies');
      
      // Configure the getCompanies mock to return expected data structure
      vi.mocked(databaseFunctions.getCompanies).mockResolvedValue({
        companies: mockCompanies,
        total: mockCompanies.length,
        hasMore: false
      });
    });

    it('should return companies with default parameters', async () => {
      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      if (!responseData.success) {
        console.log('Error response:', responseData);
        console.log('Response status:', response.status);
      }

      // Temporarily fail with the actual response to debug
      expect(responseData).toEqual({ 
        ACTUAL_RESPONSE_FOR_DEBUG: responseData,
        RESPONSE_STATUS_FOR_DEBUG: response.status 
      });
    });

    it('should handle search parameter', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/companies?search=test&limit=5&offset=10');
      
      await getCompanies(mockRequest);

      expect(databaseQueryMocks.getCompanies).toHaveBeenCalledWith(
        mockSupabaseClient,
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

      expect(databaseQueryMocks.getCompanies).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          fundingStatus: 'Series A'
        })
      );
    });

    it('should handle ordering parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/companies?orderBy=name&orderDirection=asc');
      // Using centralized database mocks
      
      await getCompanies(mockRequest);

      expect(databaseQueryMocks.getCompanies).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          orderBy: 'name',
          orderDirection: 'asc'
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      // Mock signed out user
      globalThis.testUtils.mockSignedOutUser();

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
      // Using centralized database mocks
      databaseQueryMocks.getCompanies.mockRejectedValue(new Error('Database connection failed'));

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
      // Using centralized database mocks
      
      await getCompanies(mockRequest);

      expect(databaseQueryMocks.getCompanies).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.objectContaining({
          limit: 50,
          offset: 100
        })
      );
    });

    it('should use default values for missing parameters', async () => {
      // Using centralized database mocks
      
      await getCompanies(mockRequest);

      expect(databaseQueryMocks.getCompanies).toHaveBeenCalledWith(
        mockSupabaseClient,
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
      mockSupabaseClient.from = vi.fn(() => ({
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

    it('should handle custom limit and days parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence?limit=25&days=7');
      
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(mockServiceRoleClient.from).toHaveBeenCalledWith('companies');
      expect(responseData.data.summary.timeRange).toBe('7 days');
    });

    it('should handle single day timeRange', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence?days=1');
      
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.summary.timeRange).toBe('1 day');
    });

    it('should return 401 when not authenticated in production', async () => {
      process.env.NODE_ENV = 'production';
      // Mock signed out user
      globalThis.testUtils.mockSignedOutUser();

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
      // Mock signed out user  
      globalThis.testUtils.mockSignedOutUser();

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });

    it('should transform company data correctly', async () => {
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      const company = responseData.data.companies[0];
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

    it('should calculate summary statistics correctly', async () => {
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      const summary = responseData.data.summary;
      expect(summary.totalCompanies).toBeGreaterThanOrEqual(0);
      expect(summary.totalMentions).toBeGreaterThanOrEqual(0);
      expect(parseFloat(summary.averageMentionsPerCompany)).toBeGreaterThanOrEqual(0);
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

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.companies).toHaveLength(0);
    });

    it('should calculate newsletter diversity correctly', async () => {
      const diverseData = [
        {
          id: 'diverse-company',
          name: 'Diverse Company',
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

      mockServiceRoleClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: diverseData,
          error: null
        }))
      });

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      const company = responseData.data.companies[0];
      expect(company.newsletterDiversity).toBe(2); // Only Newsletter A and B
    });

    it('should return 400 for invalid query parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence?limit=notanumber&days=invalid');
      
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Invalid query parameters',
        details: expect.any(Array)
      });
    });

    it('should handle database errors', async () => {
      mockServiceRoleClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Database error' }
        }))
      });

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Database error'
      });
    });

    it('should handle null/undefined values gracefully', async () => {
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
              emails: null // No email data
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

      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      const company = responseData.data.companies[0];
      expect(company.mentions[0].newsletter_name).toBe('Unknown');
      expect(company.totalMentions).toBeGreaterThanOrEqual(0);
    });

    it('should use default values for null parameters', async () => {
      mockRequest = createMockNextRequest('https://example.com/api/intelligence?limit=null&days=null');
      
      const response = await getIntelligence(mockRequest);
      
      // Should use defaults (50 for limit, 1 for days)
      expect(mockServiceRoleClient.from().limit).toHaveBeenCalledWith(50);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown errors gracefully', async () => {
      const mockRequest = {
        url: 'https://example.com/api/companies'
      } as any;

      // Using centralized database mocks
      databaseQueryMocks.getCompanies.mockRejectedValue('Unknown error type');

      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Unknown error'
      });
    });

    it('should log errors to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRequest = {
        url: 'https://example.com/api/companies'
      } as any;

      // Using centralized database mocks
      databaseQueryMocks.getCompanies.mockRejectedValue(new Error('Test error'));

      await getCompanies(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch companies:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Response Format', () => {
    it('should have consistent response format for success', async () => {
      const mockRequest = {
        url: 'https://example.com/api/companies'
      } as any;

      // Using centralized database mocks
      databaseQueryMocks.getCompanies.mockResolvedValue({
        companies: [],
        total: 0,
        hasMore: false
      });

      const response = await getCompanies(mockRequest);
      const responseData = await response.json();

      expect(responseData).toMatchObject({
        success: true,
        data: expect.any(Object),
        meta: {
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
          version: '1.0.0'
        }
      });
    });

    it('should have consistent response format for errors', async () => {
      const mockRequest = {
        url: 'https://example.com/api/companies'
      } as any;

      // Mock signed out user
      globalThis.testUtils.mockSignedOutUser();

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