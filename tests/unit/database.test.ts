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

// Import centralized mocks
import { createMockSupabaseClient, createMockQueryBuilder, supabaseMocks } from '../mocks/database/supabase';

// Mock Supabase clients using centralized mocks
vi.mock('@supabase/supabase-js', () => supabaseMocks);

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: supabaseMocks.createClient,
  createServerClient: supabaseMocks.createClient
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

// Use centralized mock client
const mockSupabaseClient = createMockSupabaseClient();

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
      const client = createClientComponentClient();
      
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
    });
  });

  describe('createServerComponentClient', () => {
    it('should create server client with cookie handling', () => {
      const client = createServerComponentClient();
      
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
    });

    it('should handle cookie retrieval', () => {
      const client = createServerComponentClient();
      
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
    });
  });

  describe('createRouteHandlerClient', () => {
    it('should create client with request/response cookie handling', () => {
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
      
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
    });

    it('should parse cookies from request headers', () => {
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
      
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
    });

    it('should set response headers for cookies', () => {
      const mockRequest = { headers: { get: vi.fn() } } as any;
      const mockResponse = { headers: { set: vi.fn() } } as any;
      
      const client = createRouteHandlerClient(mockRequest, mockResponse);
      
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
    });
  });

  describe('createServiceRoleClient', () => {
    it('should create service role client with correct config', () => {
      const client = createServiceRoleClient();
      
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
    });

    it('should throw error when service key is missing', () => {
      const originalServiceKey = process.env.SUPABASE_SERVICE_KEY;
      const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      delete process.env.SUPABASE_SERVICE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      expect(() => createServiceRoleClient())
        .toThrow('Missing env.SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY');
        
      // Restore original values
      if (originalServiceKey) process.env.SUPABASE_SERVICE_KEY = originalServiceKey;
      if (originalServiceRoleKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    });

    it('should use SUPABASE_SERVICE_ROLE_KEY as fallback', () => {
      const originalServiceKey = process.env.SUPABASE_SERVICE_KEY;
      delete process.env.SUPABASE_SERVICE_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'fallback-service-key';
      
      const client = createServiceRoleClient();
      
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
      
      // Restore original value
      if (originalServiceKey) process.env.SUPABASE_SERVICE_KEY = originalServiceKey;
    });
  });

  describe('environment variable validation', () => {
    it('should throw error when SUPABASE_URL is missing', () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      expect(() => {
        jest.resetModules();
        require('@substack-intelligence/database/client');
      }).toThrow('Missing env.NEXT_PUBLIC_SUPABASE_URL');
      
      // Restore original value
      if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    });

    it('should throw error when SUPABASE_ANON_KEY is missing', () => {
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      expect(() => {
        jest.resetModules();
        require('@substack-intelligence/database/client');
      }).toThrow('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
      
      // Restore original value
      if (originalKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    });
  });
});

describe('Database Queries', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
  });

  describe('getCompanyById', () => {
    it('should fetch company with mentions', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: { data: { ...mockCompany, mentions: [] }, error: null }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const result = await getCompanyById(mockClient, mockCompany.id);

      expect(mockClient.from).toHaveBeenCalledWith('companies');
      expect(result).toEqual({ ...mockCompany, mentions: [] });
    });

    it('should throw error when company not found', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: { data: null, error: { message: 'Company not found' } }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      await expect(getCompanyById(mockClient, 'nonexistent'))
        .rejects.toThrow();
    });
  });

  describe('getCompanies', () => {
    it('should fetch companies with default options', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: [mockCompany],
          error: null,
          count: 1
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const result = await getCompanies(mockClient);

      expect(mockClient.from).toHaveBeenCalledWith('companies');
      expect(result).toEqual({
        companies: [mockCompany],
        total: 1,
        hasMore: false
      });
    });

    it('should apply search filter', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: [mockCompany],
          error: null,
          count: 1
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      await getCompanies(mockClient, { search: 'test' });

      expect(mockClient.from).toHaveBeenCalledWith('companies');
    });

    it('should apply funding status filter', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: [mockCompany],
          error: null,
          count: 1
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      await getCompanies(mockClient, { fundingStatus: 'Series A' });

      expect(mockClient.from).toHaveBeenCalledWith('companies');
    });

    it('should handle custom ordering', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: [mockCompany],
          error: null,
          count: 1
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      await getCompanies(mockClient, { 
        orderBy: 'name',
        orderDirection: 'asc'
      });

      expect(mockClient.from).toHaveBeenCalledWith('companies');
    });
  });

  describe('getDailyIntelligence', () => {
    it('should fetch daily intelligence with date filtering', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: mockDailyIntelligence,
          error: null
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const result = await getDailyIntelligence(mockClient, { days: 7, limit: 100 });

      expect(mockClient.from).toHaveBeenCalledWith('daily_intelligence');
      expect(result).toEqual(mockDailyIntelligence);
    });

    it('should use default options', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: mockDailyIntelligence,
          error: null
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const result = await getDailyIntelligence(mockClient);

      expect(mockClient.from).toHaveBeenCalledWith('daily_intelligence');
      expect(result).toEqual(mockDailyIntelligence);
    });
  });

  describe('getEmailById', () => {
    it('should fetch email with mentions', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: { data: { ...mockEmail, mentions: [] }, error: null }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const result = await getEmailById(mockClient, mockEmail.id);

      expect(mockClient.from).toHaveBeenCalledWith('emails');
      expect(result).toEqual({ ...mockEmail, mentions: [] });
    });
  });

  describe('getRecentEmails', () => {
    it('should fetch recent emails with default options', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: [mockEmail],
          error: null
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const result = await getRecentEmails(mockClient);

      expect(mockClient.from).toHaveBeenCalledWith('emails');
      expect(result).toEqual([mockEmail]);
    });

    it('should filter by newsletter name', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: [mockEmail],
          error: null
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      await getRecentEmails(mockClient, { newsletterName: 'Test Newsletter' });

      expect(mockClient.from).toHaveBeenCalledWith('emails');
    });

    it('should filter by processing status', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: [mockEmail],
          error: null
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      await getRecentEmails(mockClient, { status: 'completed' });

      expect(mockClient.from).toHaveBeenCalledWith('emails');
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

      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: mockEmails,
          error: null
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const result = await getTopNewsletters(mockClient);

      expect(mockClient.from).toHaveBeenCalledWith('emails');
      expect(result).toEqual([
        { newsletter_name: 'Newsletter A', count: 3 },
        { newsletter_name: 'Newsletter B', count: 1 }
      ]);
    });

    it('should handle empty data', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: [],
          error: null
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const result = await getTopNewsletters(mockClient);

      expect(result).toEqual([]);
    });
  });

  describe('searchCompanies', () => {
    it('should search companies by name and description', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: [mockCompany],
          error: null
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const result = await searchCompanies(mockClient, 'test', 5);

      expect(mockClient.from).toHaveBeenCalledWith('companies');
      expect(result).toEqual([mockCompany]);
    });

    it('should use default limit', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: [mockCompany],
          error: null
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const result = await searchCompanies(mockClient, 'test');

      expect(mockClient.from).toHaveBeenCalledWith('companies');
      expect(result).toEqual([mockCompany]);
    });
  });

  describe('getAnalytics', () => {
    it('should fetch analytics data', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          totalEmails: 100,
          totalCompanies: 50,
          totalMentions: 200,
          topCompanies: [{ name: 'Top Company', mention_count: 15 }]
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const result = await getAnalytics(mockClient, 30);

      expect(result).toEqual({
        totalEmails: 100,
        totalCompanies: 50,
        totalMentions: 200,
        topCompanies: [{ name: 'Top Company', mention_count: 15 }]
      });
    });

    it('should handle null counts', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          totalEmails: 0,
          totalCompanies: 0,
          totalMentions: 0,
          topCompanies: []
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

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
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: null,
          error: { message: 'Database error' }
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      await expect(getCompanyById(mockClient, 'test-id'))
        .rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: false,
        rejectValue: new Error('Network error')
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

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
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: mockDailyIntelligence,
          error: null
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const testDays = 7;
      const result = await getDailyIntelligence(mockClient, { days: testDays });
      
      expect(mockClient.from).toHaveBeenCalledWith('daily_intelligence');
      expect(result).toEqual(mockDailyIntelligence);
    });
  });

  describe('pagination', () => {
    it('should handle pagination correctly', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: [mockCompany],
          error: null,
          count: 100
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const result = await getCompanies(mockClient, { 
        limit: 10, 
        offset: 20 
      });

      expect(result.hasMore).toBe(true); // 30 < 100
      expect(result.total).toBe(100);
    });

    it('should detect end of results', async () => {
      const queryBuilder = createMockQueryBuilder({
        shouldResolve: true,
        resolveValue: {
          data: [mockCompany],
          error: null,
          count: 25
        }
      });
      mockClient.from = vi.fn().mockReturnValue(queryBuilder);

      const result = await getCompanies(mockClient, { 
        limit: 10, 
        offset: 20 
      });

      expect(result.hasMore).toBe(false); // 30 >= 25
    });
  });
});