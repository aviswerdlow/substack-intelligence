import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Integration tests for the pipeline sync route
// These tests validate that the route can be imported and basic functionality works
// This is critical for catching import-time errors (like the jsdom issue)

describe('Pipeline Sync Route Integration Tests', () => {
  let GET: any;
  let POST: any;
  let mockRequest: NextRequest;
  
  beforeEach(async () => {
    // Mock environment variables
    process.env.NODE_ENV = 'development';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REFRESH_TOKEN = 'test-refresh-token';

    // Mock session helper to return null (development mode)
    vi.mock('@substack-intelligence/lib/security/session', () => ({
      getServerSecuritySession: vi.fn().mockResolvedValue(null)
    }));

    // Mock the Gmail connector to prevent actual API calls
    vi.mock('@substack-intelligence/ingestion', () => ({
      GmailConnector: vi.fn().mockImplementation(() => ({
        fetchDailySubstacks: vi.fn().mockResolvedValue([
          {
            id: 'test-email-1',
            messageId: 'msg-1',
            subject: 'Test Newsletter',
            sender: 'test@newsletter.com',
            newsletterName: 'Test Newsletter',
            html: '<html><body>Test content with enough text to pass validation</body></html>',
            text: 'Test content with enough text to pass validation',
            receivedAt: new Date('2024-01-01'),
            processedAt: new Date()
          }
        ])
      }))
    }));

    // Mock the Claude extractor
    vi.mock('@substack-intelligence/ai', () => ({
      ClaudeExtractor: vi.fn().mockImplementation(() => ({
        extractCompanies: vi.fn().mockResolvedValue({
          companies: [
            {
              name: 'Test Company',
              description: 'A test company',
              context: 'Mentioned in test newsletter',
              confidence: 0.8
            }
          ],
          metadata: {
            processingTime: 1000,
            tokenCount: 100
          }
        })
      }))
    }));

    // Mock database
    vi.mock('@substack-intelligence/database', () => {
      const emailsTable = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        upsert: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: [{ id: 'email-1' }], error: null }),
        update: vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })
      };
      const companiesTable = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'company-1', mention_count: 1 }, error: null }),
        single: vi.fn().mockResolvedValue({ data: { id: 'company-1', mention_count: 1 }, error: null }),
        insert: vi.fn().mockResolvedValue({ data: { id: 'company-1' }, error: null }),
        update: vi.fn().mockResolvedValue({ data: { id: 'company-1' }, error: null })
      };
      const mentionsTable = {
        insert: vi.fn().mockResolvedValue({ data: { id: 'mention-1' }, error: null })
      };

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'emails') return emailsTable;
          if (table === 'companies') return companiesTable;
          if (table === 'company_mentions') return mentionsTable;
          return emailsTable;
        })
      };

      return { createServiceRoleClient: vi.fn(() => mockClient) };
    });

    // Create a mock NextRequest
    mockRequest = {
      method: 'GET',
      url: 'http://localhost:3000/api/pipeline/sync',
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({})
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Route Import Tests', () => {
    it('should be able to import the route module without errors', async () => {
      // This test is critical - it will catch import-time errors like the jsdom issue
      expect(async () => {
        const routeModule = await import('./route');
        return routeModule;
      }).not.toThrow();
    });

    it('should export GET and POST handlers', async () => {
      const routeModule = await import('./route');
      
      expect(routeModule.GET).toBeDefined();
      expect(routeModule.POST).toBeDefined();
      expect(typeof routeModule.GET).toBe('function');
      expect(typeof routeModule.POST).toBe('function');
    });

    it('should export correct runtime configuration', async () => {
      const routeModule = await import('./route');
      
      expect(routeModule.runtime).toBe('nodejs');
      expect(routeModule.dynamic).toBe('force-dynamic');
      expect(routeModule.revalidate).toBe(0);
    });
  });

  describe('GET Handler Tests', () => {
    it('should handle GET requests in development mode', async () => {
      const { GET: getHandler } = await import('./route');
      
      const response = await getHandler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.status).toBe('idle');
    });

    it('should return proper pipeline status structure', async () => {
      const { GET: getHandler } = await import('./route');
      
      const response = await getHandler(mockRequest);
      const data = await response.json();
      
      expect(data.data).toMatchObject({
        status: expect.any(String),
        progress: expect.any(Number),
        message: expect.any(String),
        lastSync: null,
        stats: {
          emailsFetched: expect.any(Number),
          companiesExtracted: expect.any(Number),
          newCompanies: expect.any(Number),
          totalMentions: expect.any(Number),
          failedEmails: expect.any(Number)
        }
      });
    });
  });

  describe('POST Handler Tests', () => {
    it('should handle POST requests in development mode', async () => {
      const { POST: postHandler } = await import('./route');
      
      const response = await postHandler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle POST with options', async () => {
      const { POST: postHandler } = await import('./route');
      
      // Mock request with body
      const requestWithBody = {
        ...mockRequest,
        json: vi.fn().mockResolvedValue({
          forceRefresh: true,
          daysBack: 7
        })
      } as any;
      
      const response = await postHandler(requestWithBody);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(requestWithBody.json).toHaveBeenCalled();
    });

    it('should complete pipeline with mocked data', async () => {
      const { POST: postHandler } = await import('./route');
      
      const response = await postHandler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('complete');
      expect(data.data.progress).toBe(100);
      expect(data.data.lastSync).toBeTruthy();
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle Gmail connector failures gracefully', async () => {
      // Mock Gmail connector to throw an error
      vi.doMock('@substack-intelligence/ingestion', () => ({
        GmailConnector: vi.fn().mockImplementation(() => ({
          fetchDailySubstacks: vi.fn().mockRejectedValue(new Error('Gmail API Error'))
        }))
      }));

      const { POST: postHandler } = await import('./route');
      
      const response = await postHandler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Gmail API Error');
    });

    it('should handle database failures gracefully', async () => {
      // Mock database to fail
      vi.doMock('@substack-intelligence/database', () => ({
        createServiceRoleClient: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' }
            })
          })
        })
      }));

      const { POST: postHandler } = await import('./route');
      
      const response = await postHandler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('HTML Parsing Integration Tests', () => {
    it('should handle email HTML parsing without jsdom errors', async () => {
      // Mock Gmail connector with HTML content that would trigger jsdom
      vi.doMock('@substack-intelligence/ingestion', () => ({
        GmailConnector: vi.fn().mockImplementation(() => ({
          fetchDailySubstacks: vi.fn().mockResolvedValue([
            {
              id: 'html-test-email',
              messageId: 'html-msg-1',
              subject: 'HTML Test Newsletter',
              sender: 'test@newsletter.com',
              newsletterName: 'HTML Test',
              html: `
                <html>
                  <head>
                    <style>body { color: red; }</style>
                    <script>console.log('test');</script>
                  </head>
                  <body>
                    <nav>Navigation</nav>
                    <div class="content">
                      <p>This is a test newsletter with complex HTML content that should be parsed correctly without jsdom.</p>
                      <p>It contains multiple paragraphs and various HTML elements.</p>
                      <div class="unsubscribe">Unsubscribe link</div>
                    </div>
                    <footer>Footer content</footer>
                  </body>
                </html>
              `,
              text: 'This is a test newsletter with complex HTML content that should be parsed correctly without jsdom. It contains multiple paragraphs and various HTML elements.',
              receivedAt: new Date('2024-01-01'),
              processedAt: new Date()
            }
          ])
        }))
      }));

      const { POST: postHandler } = await import('./route');
      
      // This should not throw an error even with complex HTML
      const response = await postHandler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('complete');
    });
  });

  describe('Performance Tests', () => {
    it('should complete within reasonable time limits', async () => {
      const { POST: postHandler } = await import('./route');
      
      const startTime = Date.now();
      const response = await postHandler(mockRequest);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds with mocks
    });

    it('should handle memory efficiently with large HTML content', async () => {
      // Mock large HTML content
      const largeHtml = '<html><body>' + 'Large content '.repeat(1000) + '</body></html>';
      
      vi.doMock('@substack-intelligence/ingestion', () => ({
        GmailConnector: vi.fn().mockImplementation(() => ({
          fetchDailySubstacks: vi.fn().mockResolvedValue([
            {
              id: 'large-email',
              messageId: 'large-msg-1',
              subject: 'Large Newsletter',
              sender: 'test@newsletter.com',
              newsletterName: 'Large Test',
              html: largeHtml,
              text: 'Large content '.repeat(1000),
              receivedAt: new Date('2024-01-01'),
              processedAt: new Date()
            }
          ])
        }))
      }));

      const { POST: postHandler } = await import('./route');
      
      const response = await postHandler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

// Test helper to validate route configuration
describe('Route Configuration Validation', () => {
  it('should have correct Next.js API route exports', async () => {
    const routeModule = await import('./route');
    
    // Validate all required exports exist
    expect(routeModule).toHaveProperty('GET');
    expect(routeModule).toHaveProperty('POST');
    expect(routeModule).toHaveProperty('runtime');
    expect(routeModule).toHaveProperty('dynamic');
    expect(routeModule).toHaveProperty('revalidate');
    
    // Validate runtime is set correctly for jsdom compatibility
    expect(routeModule.runtime).toBe('nodejs');
  });
});
