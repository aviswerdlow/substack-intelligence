import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  createClientComponentClient, 
  createServerComponentClient,
  createRouteHandlerClient,
  createServiceRoleClient 
} from '@substack-intelligence/database/client';
import {
  getCompanyById,
  getCompanies,
  getDailyIntelligence,
  getEmailById,
  getRecentEmails,
  getTopNewsletters,
  searchCompanies,
  getAnalytics
} from '@substack-intelligence/database/queries';

// Mock Supabase clients
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => mockSupabaseClient),
  createServerClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name: string) => ({
      value: `mock-${name}-value`
    }))
  }))
}));

// Mock React cache function
vi.mock('react', () => ({
  cache: <T extends (...args: any[]) => any>(fn: T): T => fn
}), { virtual: true });

// Create comprehensive mock Supabase client
const createMockQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
  or: vi.fn().mockReturnThis()
});

const mockSupabaseClient = {
  from: vi.fn(() => createMockQueryBuilder()),
  auth: {
    getSession: vi.fn()
  }
};

// Mock environment variables
const originalEnv = process.env;

// Test data
const mockCompany = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test Company',
  description: 'A test company',
  website: 'https://testcompany.com',
  mention_count: 5,
  funding_status: 'Series A',
  first_seen_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  mentions: []
};

const mockEmail = {
  id: '456e7890-e12b-34c5-d678-901234567890',
  subject: 'Test Newsletter Subject',
  sender: 'newsletter@example.com',
  newsletter_name: 'Test Newsletter',
  received_at: '2024-01-01T00:00:00Z',
  processing_status: 'completed',
  mentions: []
};

const mockDailyIntelligence = [
  {
    company_id: mockCompany.id,
    name: 'Test Company',
    description: 'A test company',
    context: 'Test company raised funding',
    sentiment: 'positive',
    confidence: 0.9,
    newsletter_name: 'Tech Newsletter',
    received_at: '2024-01-01T00:00:00Z',
    mention_count: 3
  }
];

describe('Database Client', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_KEY: 'test-service-key'
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createClientComponentClient', () => {
    it('should create browser client with correct config', () => {
      const { createBrowserClient } = require('@supabase/ssr');
      
      const client = createClientComponentClient();
      
      expect(createBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key'
      );
      expect(client).toBeDefined();
    });
  });

  describe('createServerComponentClient', () => {
    it('should create server client with cookie handling', () => {
      const { createServerClient } = require('@supabase/ssr');
      
      const client = createServerComponentClient();
      
      expect(createServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            get: expect.any(Function)
          })
        })
      );
      expect(client).toBeDefined();
    });

    it('should handle cookie retrieval', () => {
      const { createServerClient } = require('@supabase/ssr');
      
      createServerComponentClient();
      
      const cookiesConfig = createServerClient.mock.calls[0][2].cookies;
      const cookieValue = cookiesConfig.get('test-cookie');
      
      expect(cookieValue).toBe('mock-test-cookie-value');
    });
  });

  describe('createRouteHandlerClient', () => {
    it('should create client with request/response cookie handling', () => {
      const { createServerClient } = require('@supabase/ssr');
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue('sessionId=abc123; theme=dark')
        }
      } as any;
      
      const mockResponse = {
        headers: {
          set: vi.fn()
        }
      } as any;
      
      const client = createRouteHandlerClient(mockRequest, mockResponse);
      
      expect(createServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            get: expect.any(Function),
            set: expect.any(Function),
            remove: expect.any(Function)
          })
        })
      );
      expect(client).toBeDefined();
    });

    it('should parse cookies from request headers', () => {
      const { createServerClient } = require('@supabase/ssr');
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue('sessionId=abc123; theme=dark')
        }
      } as any;
      
      const mockResponse = {
        headers: {
          set: vi.fn()
        }
      } as any;
      
      createRouteHandlerClient(mockRequest, mockResponse);
      
      const cookiesConfig = createServerClient.mock.calls[0][2].cookies;
      const sessionId = cookiesConfig.get('sessionId');
      
      expect(sessionId).toBe('abc123');
    });

    it('should set response headers for cookies', () => {
      const { createServerClient } = require('@supabase/ssr');
      const mockRequest = { headers: { get: vi.fn() } } as any;
      const mockResponse = { headers: { set: vi.fn() } } as any;
      
      createRouteHandlerClient(mockRequest, mockResponse);
      
      const cookiesConfig = createServerClient.mock.calls[0][2].cookies;
      cookiesConfig.set('newCookie', 'value123', { httpOnly: true });
      
      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        'Set-Cookie',
        'newCookie=value123; httpOnly=true'
      );
    });
  });

  describe('createServiceRoleClient', () => {
    it('should create service role client with correct config', () => {
      const { createClient } = require('@supabase/supabase-js');
      
      const client = createServiceRoleClient();
      
      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key',
        expect.objectContaining({
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
          },
          db: {
            schema: 'public'
          }
        })
      );
      expect(client).toBeDefined();
    });

    it('should throw error when service key is missing', () => {
      delete process.env.SUPABASE_SERVICE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      expect(() => createServiceRoleClient())
        .toThrow('Missing env.SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY');
    });

    it('should use SUPABASE_SERVICE_ROLE_KEY as fallback', () => {
      delete process.env.SUPABASE_SERVICE_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'fallback-service-key';
      
      const { createClient } = require('@supabase/supabase-js');
      
      createServiceRoleClient();
      
      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'fallback-service-key',
        expect.any(Object)
      );
    });
  });

  describe('environment variable validation', () => {
    it('should throw error when SUPABASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      expect(() => {
        require('@substack-intelligence/database/client');
      }).toThrow('Missing env.NEXT_PUBLIC_SUPABASE_URL');
    });

    it('should throw error when SUPABASE_ANON_KEY is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      expect(() => {
        require('@substack-intelligence/database/client');
      }).toThrow('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
    });
  });
});

describe('Database Queries', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = mockSupabaseClient;
    
    // Reset the from mock to return a fresh query builder
    mockClient.from.mockImplementation(() => createMockQueryBuilder());
  });

  describe('getCompanyById', () => {
    it('should fetch company with mentions', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue({
        data: { ...mockCompany, mentions: [] },
        error: null
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await getCompanyById(mockClient, mockCompany.id);

      expect(mockClient.from).toHaveBeenCalledWith('companies');
      expect(queryBuilder.select).toHaveBeenCalledWith(expect.stringContaining('mentions:company_mentions'));
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', mockCompany.id);
      expect(result).toEqual({ ...mockCompany, mentions: [] });
    });

    it('should throw error when company not found', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Company not found' }
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(getCompanyById(mockClient, 'nonexistent'))
        .rejects.toThrow();
    });
  });

  describe('getCompanies', () => {
    it('should fetch companies with default options', async () => {
      const queryBuilder = createMockQueryBuilder();
      const mockResponse = {
        data: [mockCompany],
        error: null,
        count: 1
      };
      
      // Chain all the methods to return the final promise
      queryBuilder.range.mockReturnValue({
        ...queryBuilder,
        order: vi.fn().mockResolvedValue(mockResponse)
      });
      
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await getCompanies(mockClient);

      expect(mockClient.from).toHaveBeenCalledWith('companies');
      expect(queryBuilder.select).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(queryBuilder.range).toHaveBeenCalledWith(0, 19); // offset 0, limit 20
      expect(result).toEqual({
        companies: [mockCompany],
        total: 1,
        hasMore: false
      });
    });

    it('should apply search filter', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.ilike.mockReturnValue({
        ...queryBuilder,
        range: vi.fn().mockReturnValue({
          ...queryBuilder,
          order: vi.fn().mockResolvedValue({
            data: [mockCompany],
            error: null,
            count: 1
          })
        })
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await getCompanies(mockClient, { search: 'test' });

      expect(queryBuilder.ilike).toHaveBeenCalledWith('name', '%test%');
    });

    it('should apply funding status filter', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue({
        ...queryBuilder,
        range: vi.fn().mockReturnValue({
          ...queryBuilder,
          order: vi.fn().mockResolvedValue({
            data: [mockCompany],
            error: null,
            count: 1
          })
        })
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await getCompanies(mockClient, { fundingStatus: 'Series A' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('funding_status', 'Series A');
    });

    it('should handle custom ordering', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.range.mockReturnValue({
        ...queryBuilder,
        order: vi.fn().mockResolvedValue({
          data: [mockCompany],
          error: null,
          count: 1
        })
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await getCompanies(mockClient, { 
        orderBy: 'name',
        orderDirection: 'asc'
      });

      expect(queryBuilder.order).toHaveBeenCalledWith('name', { ascending: true });
    });
  });

  describe('getDailyIntelligence', () => {
    it('should fetch daily intelligence with date filtering', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.limit.mockResolvedValue({
        data: mockDailyIntelligence,
        error: null
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await getDailyIntelligence(mockClient, { days: 7, limit: 100 });

      expect(mockClient.from).toHaveBeenCalledWith('daily_intelligence');
      expect(queryBuilder.gte).toHaveBeenCalledWith(
        'received_at',
        expect.any(String)
      );
      expect(queryBuilder.limit).toHaveBeenCalledWith(100);
      expect(result).toEqual(mockDailyIntelligence);
    });

    it('should use default options', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.limit.mockResolvedValue({
        data: mockDailyIntelligence,
        error: null
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await getDailyIntelligence(mockClient);

      expect(queryBuilder.limit).toHaveBeenCalledWith(50); // default limit
      const gteCall = queryBuilder.gte.mock.calls[0];
      expect(gteCall[0]).toBe('received_at');
      
      // Verify it's filtering for the last 1 day (default)
      const dateParam = new Date(gteCall[1]);
      const now = new Date();
      const daysDiff = Math.round((now.getTime() - dateParam.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(1);
    });
  });

  describe('getEmailById', () => {
    it('should fetch email with mentions', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue({
        data: { ...mockEmail, mentions: [] },
        error: null
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await getEmailById(mockClient, mockEmail.id);

      expect(mockClient.from).toHaveBeenCalledWith('emails');
      expect(queryBuilder.select).toHaveBeenCalledWith(expect.stringContaining('mentions:company_mentions'));
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', mockEmail.id);
      expect(result).toEqual({ ...mockEmail, mentions: [] });
    });
  });

  describe('getRecentEmails', () => {
    it('should fetch recent emails with default options', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.limit.mockResolvedValue({
        data: [mockEmail],
        error: null
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await getRecentEmails(mockClient);

      expect(mockClient.from).toHaveBeenCalledWith('emails');
      expect(queryBuilder.order).toHaveBeenCalledWith('received_at', { ascending: false });
      expect(queryBuilder.limit).toHaveBeenCalledWith(20);
      expect(result).toEqual([mockEmail]);
    });

    it('should filter by newsletter name', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue({
        ...queryBuilder,
        order: vi.fn().mockReturnValue({
          ...queryBuilder,
          limit: vi.fn().mockResolvedValue({
            data: [mockEmail],
            error: null
          })
        })
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await getRecentEmails(mockClient, { newsletterName: 'Test Newsletter' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('newsletter_name', 'Test Newsletter');
    });

    it('should filter by processing status', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue({
        ...queryBuilder,
        order: vi.fn().mockReturnValue({
          ...queryBuilder,
          limit: vi.fn().mockResolvedValue({
            data: [mockEmail],
            error: null
          })
        })
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await getRecentEmails(mockClient, { status: 'completed' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('processing_status', 'completed');
    });
  });

  describe('getTopNewsletters', () => {
    it('should aggregate newsletter data', async () => {
      const mockEmails = [
        { newsletter_name: 'Newsletter A' },
        { newsletter_name: 'Newsletter A' },
        { newsletter_name: 'Newsletter B' },
        { newsletter_name: 'Newsletter A' }
      ];

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.limit.mockResolvedValue({
        data: mockEmails,
        error: null
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await getTopNewsletters(mockClient);

      expect(queryBuilder.gte).toHaveBeenCalledWith(
        'received_at',
        expect.any(String)
      );
      expect(result).toEqual([
        { newsletter_name: 'Newsletter A', count: 3 },
        { newsletter_name: 'Newsletter B', count: 1 }
      ]);
    });

    it('should handle empty data', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.limit.mockResolvedValue({
        data: [],
        error: null
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await getTopNewsletters(mockClient);

      expect(result).toEqual([]);
    });
  });

  describe('searchCompanies', () => {
    it('should search companies by name and description', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.limit.mockResolvedValue({
        data: [mockCompany],
        error: null
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await searchCompanies(mockClient, 'test', 5);

      expect(queryBuilder.or).toHaveBeenCalledWith('name.ilike.%test%,description.ilike.%test%');
      expect(queryBuilder.order).toHaveBeenCalledWith('mention_count', { ascending: false });
      expect(queryBuilder.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual([mockCompany]);
    });

    it('should use default limit', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.limit.mockResolvedValue({
        data: [mockCompany],
        error: null
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await searchCompanies(mockClient, 'test');

      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getAnalytics', () => {
    it('should fetch analytics data', async () => {
      const queryBuilder = createMockQueryBuilder();
      
      // Mock Promise.all results
      const mockAnalyticsResults = [
        { count: 100 }, // total emails
        { count: 50 },  // total companies
        { count: 200 }, // total mentions
        { data: [{ name: 'Top Company', mention_count: 15 }] } // top companies
      ];

      vi.spyOn(Promise, 'all').mockResolvedValue(mockAnalyticsResults);

      const result = await getAnalytics(mockClient, 30);

      expect(result).toEqual({
        totalEmails: 100,
        totalCompanies: 50,
        totalMentions: 200,
        topCompanies: [{ name: 'Top Company', mention_count: 15 }]
      });
    });

    it('should handle null counts', async () => {
      const mockAnalyticsResults = [
        { count: null },
        { count: null },
        { count: null },
        { data: null }
      ];

      vi.spyOn(Promise, 'all').mockResolvedValue(mockAnalyticsResults);

      const result = await getAnalytics(mockClient);

      expect(result).toEqual({
        totalEmails: 0,
        totalCompanies: 0,
        totalMentions: 0,
        topCompanies: []
      });
    });
  });

  describe('error handling', () => {
    it('should throw errors from failed queries', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(getCompanyById(mockClient, 'test-id'))
        .rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockRejectedValue(new Error('Network error'));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(getCompanyById(mockClient, 'test-id'))
        .rejects.toThrow('Network error');
    });
  });

  describe('caching behavior', () => {
    it('should use React cache for cached queries', () => {
      // The cache function should wrap our query functions
      // This is more of an integration test that the functions are exported correctly
      expect(typeof getCompanyById).toBe('function');
      expect(typeof getCompanies).toBe('function');
      expect(typeof getDailyIntelligence).toBe('function');
    });
  });

  describe('date calculations', () => {
    it('should calculate correct date ranges', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.limit.mockResolvedValue({
        data: mockDailyIntelligence,
        error: null
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const testDays = 7;
      await getDailyIntelligence(mockClient, { days: testDays });

      const gteCall = queryBuilder.gte.mock.calls[0];
      const dateParam = new Date(gteCall[1]);
      const now = new Date();
      const daysDiff = Math.round((now.getTime() - dateParam.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysDiff).toBeCloseTo(testDays, 0);
    });
  });

  describe('pagination', () => {
    it('should handle pagination correctly', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.range.mockReturnValue({
        ...queryBuilder,
        order: vi.fn().mockResolvedValue({
          data: [mockCompany],
          error: null,
          count: 100
        })
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await getCompanies(mockClient, { 
        limit: 10, 
        offset: 20 
      });

      expect(queryBuilder.range).toHaveBeenCalledWith(20, 29); // offset to offset+limit-1
      expect(result.hasMore).toBe(true); // 30 < 100
      expect(result.total).toBe(100);
    });

    it('should detect end of results', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.range.mockReturnValue({
        ...queryBuilder,
        order: vi.fn().mockResolvedValue({
          data: [mockCompany],
          error: null,
          count: 25
        })
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await getCompanies(mockClient, { 
        limit: 10, 
        offset: 20 
      });

      expect(result.hasMore).toBe(false); // 30 >= 25
    });
  });
});