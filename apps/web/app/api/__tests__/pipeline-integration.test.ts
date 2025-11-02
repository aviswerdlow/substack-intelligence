import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as pipelineStatusGET, POST as pipelineSyncPOST } from '../pipeline/sync/route';
import { GET as pipelineMetricsGET } from '../pipeline/status/route';
import { GET as gmailHealthGET } from '../auth/gmail/health/route';

// Mock external dependencies
vi.mock('@substack-intelligence/lib/security/session', () => ({
  getServerSecuritySession: vi.fn(() => Promise.resolve({
    session: { user: { id: 'test-user-123' }, expires: new Date().toISOString() } as any,
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'admin',
      permissions: [],
      isVerified: true
    },
    rememberMe: false,
    sessionId: 'test-session'
  }))
}));

vi.mock('@substack-intelligence/database', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: null })),
    gte: vi.fn().mockReturnThis()
  }))
}));

vi.mock('@substack-intelligence/ingestion', () => ({
  GmailConnector: vi.fn().mockImplementation(() => ({
    fetchDailySubstacks: vi.fn(() => Promise.resolve([])),
    testConnection: vi.fn(() => Promise.resolve(true))
  }))
}));

vi.mock('@substack-intelligence/ai', () => ({
  ClaudeExtractor: vi.fn().mockImplementation(() => ({
    extractCompanies: vi.fn(() => Promise.resolve({ companies: [] }))
  }))
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn()
      }))
    },
    gmail: vi.fn(() => ({
      users: {
        getProfile: vi.fn(() => Promise.resolve({
          data: { emailAddress: 'test@gmail.com', messagesTotal: 1000 }
        }))
      }
    }))
  }
}));

describe('Pipeline API Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };
    
    // Set up test environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REFRESH_TOKEN = 'test-refresh-token';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Pipeline Status API (/api/pipeline/status)', () => {
    it('returns successful response with pipeline metrics', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ 
          data: { received_at: new Date().toISOString() } 
        })),
        gte: vi.fn().mockReturnThis()
      };
      
      // Mock successful database queries
      const mockPromises = [
        Promise.resolve({ count: 100 }), // total emails
        Promise.resolve({ count: 50 }),  // total companies  
        Promise.resolve({ count: 200 }), // total mentions
        Promise.resolve({ count: 10 }),  // recent emails
        Promise.resolve({ count: 5 })    // recent companies
      ];

      mockSupabase.from.mockImplementation(() => mockSupabase);
      vi.mocked(require('@substack-intelligence/database').createServiceRoleClient)
        .mockReturnValue({
          ...mockSupabase,
          from: vi.fn((table) => {
            const mockQuery = { ...mockSupabase };
            if (table === 'emails') {
              return {
                ...mockQuery,
                select: vi.fn((columns) => {
                  if (columns === 'received_at') {
                    return {
                      ...mockQuery,
                      single: () => Promise.resolve({ data: { received_at: new Date().toISOString() } })
                    };
                  }
                  if (columns === '*') {
                    return {
                      ...mockQuery,
                      gte: () => mockPromises[3] // recent emails
                    };
                  }
                  return mockPromises[0]; // total emails
                })
              };
            }
            return mockPromises[1]; // companies/mentions
          })
        });

      const request = new NextRequest('http://localhost/api/pipeline/status');
      const response = await pipelineMetricsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.totalEmails).toBe(100);
      expect(data.meta.timestamp).toBeDefined();
    });

    it('handles database errors gracefully', async () => {
      vi.mocked(require('@substack-intelligence/database').createServiceRoleClient)
        .mockReturnValue({
          from: vi.fn(() => ({
            select: vi.fn(() => Promise.reject(new Error('Database connection failed')))
          }))
        });

      const request = new NextRequest('http://localhost/api/pipeline/status');
      const response = await pipelineMetricsGET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database connection failed');
    });
  });

  describe('Pipeline Sync Status API (/api/pipeline/sync GET)', () => {
    it('returns current pipeline status', async () => {
      const request = new NextRequest('http://localhost/api/pipeline/sync');
      const response = await pipelineStatusGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBeDefined();
      expect(data.data.configurationStatus).toBeDefined();
      expect(data.data.configurationStatus.isOAuthConfigured).toBe(true);
    });

    it('includes configuration status in response', async () => {
      const request = new NextRequest('http://localhost/api/pipeline/sync');
      const response = await pipelineStatusGET(request);
      const data = await response.json();

      expect(data.data.configurationStatus.isOAuthConfigured).toBe(true);
      expect(data.data.configurationStatus.missingEnvVars).toEqual([]);
    });

    it('detects missing OAuth configuration', async () => {
      // Remove OAuth environment variables
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const request = new NextRequest('http://localhost/api/pipeline/sync');
      const response = await pipelineStatusGET(request);
      const data = await response.json();

      expect(data.data.configurationStatus.isOAuthConfigured).toBe(false);
      expect(data.data.configurationStatus.missingEnvVars).toContain('GOOGLE_CLIENT_ID');
      expect(data.data.configurationStatus.missingEnvVars).toContain('GOOGLE_CLIENT_SECRET');
    });
  });

  describe('Pipeline Sync Trigger API (/api/pipeline/sync POST)', () => {
    it('validates OAuth configuration before sync', async () => {
      // Remove all OAuth credentials
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_REFRESH_TOKEN;

      const request = new NextRequest('http://localhost/api/pipeline/sync', {
        method: 'POST',
        body: JSON.stringify({ forceRefresh: true })
      });
      
      const response = await pipelineSyncPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Gmail OAuth configuration incomplete');
      expect(data.details.setupRequired).toBe(true);
      expect(data.details.missingVars).toEqual(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN']);
    });

    it('successfully triggers pipeline sync with valid config', async () => {
      // Mock successful Gmail connector
      vi.mocked(require('@substack-intelligence/ingestion').GmailConnector)
        .mockImplementation(() => ({
          fetchDailySubstacks: vi.fn(() => Promise.resolve([
            {
              id: 'test-email-1',
              subject: 'Test Newsletter',
              html: 'Test content',
              text: 'Test text content'
            }
          ]))
        }));

      const request = new NextRequest('http://localhost/api/pipeline/sync', {
        method: 'POST',
        body: JSON.stringify({ forceRefresh: true })
      });
      
      const response = await pipelineSyncPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('complete');
      expect(data.data.stats).toBeDefined();
    });

    it('skips sync when data is fresh and not forced', async () => {
      // Mock pipeline status with recent sync
      const request = new NextRequest('http://localhost/api/pipeline/sync', {
        method: 'POST',
        body: JSON.stringify({ forceRefresh: false })
      });
      
      const response = await pipelineSyncPOST(request);
      const data = await response.json();

      // Should skip because no previous sync time is set in test environment
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('handles Gmail connector failures gracefully', async () => {
      // Mock Gmail connector to throw error
      vi.mocked(require('@substack-intelligence/ingestion').GmailConnector)
        .mockImplementation(() => ({
          fetchDailySubstacks: vi.fn(() => Promise.reject(new Error('Gmail API quota exceeded')))
        }));

      const request = new NextRequest('http://localhost/api/pipeline/sync', {
        method: 'POST',
        body: JSON.stringify({ forceRefresh: true })
      });
      
      const response = await pipelineSyncPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Gmail API quota exceeded');
      expect(data.data.status).toBe('error');
    });
  });

  describe('Gmail Health Check API (/api/auth/gmail/health)', () => {
    it('returns healthy status with valid OAuth configuration', async () => {
      const request = new NextRequest('http://localhost/api/auth/gmail/health');
      const response = await gmailHealthGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.healthy).toBe(true);
      expect(data.details.emailAddress).toBe('test@gmail.com');
      expect(data.details.configurationComplete).toBe(true);
    });

    it('detects missing OAuth configuration', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_REFRESH_TOKEN;

      const request = new NextRequest('http://localhost/api/auth/gmail/health');
      const response = await gmailHealthGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.healthy).toBe(false);
      expect(data.error).toContain('Gmail OAuth configuration incomplete');
      expect(data.details.configurationIssues).toBe(true);
      expect(data.details.missingEnvVars).toContain('GOOGLE_CLIENT_ID');
      expect(data.details.missingEnvVars).toContain('GOOGLE_REFRESH_TOKEN');
    });

    it('handles Gmail API connection failures', async () => {
      // Mock Gmail API to throw error
      vi.mocked(require('googleapis').google.gmail)
        .mockImplementation(() => ({
          users: {
            getProfile: vi.fn(() => Promise.reject(new Error('Invalid refresh token')))
          }
        }));

      const request = new NextRequest('http://localhost/api/auth/gmail/health');
      const response = await gmailHealthGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.healthy).toBe(false);
      expect(data.error).toContain('Gmail API connection failed');
      expect(data.details.configurationComplete).toBe(true);
      expect(data.details.gmailApiError).toContain('Invalid refresh token');
    });

    it('validates all required OAuth environment variables', async () => {
      const testCases = [
        { missing: 'GOOGLE_CLIENT_ID', remaining: ['GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'] },
        { missing: 'GOOGLE_CLIENT_SECRET', remaining: ['GOOGLE_CLIENT_ID', 'GOOGLE_REFRESH_TOKEN'] },
        { missing: 'GOOGLE_REFRESH_TOKEN', remaining: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] }
      ];

      for (const testCase of testCases) {
        // Reset environment
        process.env = { ...originalEnv };
        delete process.env[testCase.missing];
        
        const response = await gmailHealthGET();
        const data = await response.json();

        expect(data.healthy).toBe(false);
        expect(data.details.missingEnvVars).toContain(testCase.missing);
      }
    });
  });

  describe('Authentication', () => {
    it('requires authentication for production environment', async () => {
      process.env.NODE_ENV = 'production';
      
      // Mock no authenticated user
      vi.mocked(require('@substack-intelligence/lib/security/session').getServerSecuritySession)
        .mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/pipeline/status');
      const response = await pipelineMetricsGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('allows access in development environment without auth', async () => {
      process.env.NODE_ENV = 'development';
      
      vi.mocked(require('@substack-intelligence/lib/security/session').getServerSecuritySession)
        .mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/pipeline/status');
      const response = await pipelineMetricsGET(request);

      // Should not return 401 in development
      expect(response.status).not.toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('handles malformed request bodies gracefully', async () => {
      const request = new NextRequest('http://localhost/api/pipeline/sync', {
        method: 'POST',
        body: 'invalid-json-body'
      });
      
      const response = await pipelineSyncPOST(request);
      const data = await response.json();

      // Should still work with default options when body parsing fails
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('provides detailed error information in development', async () => {
      process.env.NODE_ENV = 'development';
      
      // Force an error
      vi.mocked(require('@substack-intelligence/ingestion').GmailConnector)
        .mockImplementation(() => {
          throw new Error('Test error with stack trace');
        });

      const request = new NextRequest('http://localhost/api/pipeline/sync', {
        method: 'POST',
        body: JSON.stringify({ forceRefresh: true })
      });
      
      const response = await pipelineSyncPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Test error with stack trace');
    });
  });
});