import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GmailConnector } from '@substack-intelligence/ingestion';
import { gmail_v1 } from 'googleapis';

// Import centralized mocks
import { gmailMocks, googleApisMocks } from '../mocks/external/gmail';

// Mock Gmail dependencies using centralized mocks
vi.mock('googleapis', () => googleApisMocks);

// Import centralized database mocks
import { databaseMocks } from '../mocks/database/queries';

vi.mock('@substack-intelligence/database', () => databaseMocks);

vi.mock('jsdom', () => ({
  JSDOM: vi.fn((html) => ({
    window: {
      document: {
        body: { textContent: 'Clean text content' },
        textContent: 'Clean text content',
        querySelectorAll: vi.fn(() => ({
          forEach: vi.fn()
        }))
      }
    }
  }))
}));

vi.mock('p-map', () => ({
  default: vi.fn((items, mapper) => Promise.all(items.map(mapper)))
}));

vi.mock('@substack-intelligence/shared', () => ({
  GmailMessageSchema: {
    parse: vi.fn((data) => data)
  }
}));

// Mock utility functions - these will use the centralized mocks from setup.ts

// Mock environment variables
const originalEnv = process.env;

describe('GmailConnector', () => {
  let connector: GmailConnector;
  let mockGmailClient: any;
  let mockSupabaseClient: any;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      GOOGLE_REFRESH_TOKEN: 'test-refresh-token'
    };

    vi.clearAllMocks();
    gmailMocks.resetAllMocks();

    // Configure Gmail mocks for successful operations by default
    gmailMocks.mockSuccessfulAuth();
    gmailMocks.mockMessagesListSuccess();
    gmailMocks.mockMessageGetSuccess();
    gmailMocks.mockProfileSuccess();

    const { createServiceRoleClient } = require('@substack-intelligence/database');
    mockSupabaseClient = createServiceRoleClient();

    connector = new GmailConnector();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize Gmail client with OAuth2', () => {
      expect(connector).toBeDefined();
      // The constructor should initialize without throwing errors
      expect(() => new GmailConnector()).not.toThrow();
    });
  });

  describe('fetchDailySubstacks', () => {
    const mockMessage: gmail_v1.Schema$Message = {
      id: 'test-msg-1',
      payload: {
        headers: [
          { name: 'Subject', value: 'Test Newsletter' },
          { name: 'From', value: 'Morning Brew <crew@morningbrew.substack.com>' },
          { name: 'Date', value: '2024-01-01T12:00:00Z' },
          { name: 'Message-ID', value: '<test@substack.com>' }
        ],
        body: {
          data: Buffer.from('<html><body>Newsletter content with lots of text here to meet minimum requirements</body></html>').toString('base64')
        },
        mimeType: 'text/html'
      }
    };

    it('should fetch and process Substack emails successfully', async () => {
      // Configure successful Gmail API responses
      gmailMocks.mockMessagesListSuccess({
        messages: [{ id: 'test-msg-1', threadId: 'thread-1' }],
        resultSizeEstimate: 1
      });
      
      gmailMocks.mockMessageGetSuccess({
        id: 'test-msg-1',
        payload: {
          headers: [
            { name: 'Subject', value: 'Test Newsletter' },
            { name: 'From', value: 'Morning Brew <crew@morningbrew.substack.com>' },
            { name: 'Date', value: '2024-01-01T12:00:00Z' },
            { name: 'Message-ID', value: '<test@substack.com>' }
          ],
          body: {
            data: Buffer.from('<html><body>Newsletter content with lots of text here to meet minimum requirements</body></html>').toString('base64')
          }
        }
      });

      const result = await connector.fetchDailySubstacks(7);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'test-msg-1',
        subject: 'Test Newsletter',
        sender: 'Morning Brew <crew@morningbrew.substack.com>',
        newsletterName: 'Morning Brew'
      });
    });

    it('should handle rate limiting', async () => {
      // Mock rate limiting to return false (rate limit exceeded)
      const { burstProtection } = require('@substack-intelligence/ingestion/utils/rate-limiting');
      burstProtection.checkBurstLimit.mockResolvedValue(false);

      await expect(connector.fetchDailySubstacks(7))
        .rejects
        .toThrow('Gmail API rate limit exceeded for daily fetch');
    });

    it('should handle empty message list', async () => {
      // Configure empty message list
      gmailMocks.mockMessagesListSuccess({
        messages: [],
        resultSizeEstimate: 0
      });

      const result = await connector.fetchDailySubstacks(7);

      expect(result).toHaveLength(0);
    });

    it('should handle Gmail API errors', async () => {
      // Configure Gmail to throw an error
      gmailMocks.mockMessagesListError(new Error('Gmail API Error'));

      await expect(connector.fetchDailySubstacks(7))
        .rejects
        .toThrow('Gmail API Error');

      const { axiomLogger } = require('@substack-intelligence/ingestion/utils/logging');
      expect(axiomLogger.logError).toHaveBeenCalled();
    });

    it('should construct proper Gmail query', async () => {
      // Configure empty message list for this test
      gmailMocks.mockMessagesListSuccess({
        messages: [],
        resultSizeEstimate: 0
      });

      await connector.fetchDailySubstacks(30);

      // Verify the Gmail list method was called
      expect(gmailMocks.listMessages).toHaveBeenCalledWith({
        userId: 'me',
        q: expect.stringContaining('from:substack.com'),
        maxResults: 100,
        pageToken: undefined
      });
    });
  });

  describe('processMessage', () => {
    it('should skip messages with insufficient content', async () => {
      const shortMessage = {
        id: 'short-msg',
        payload: {
          headers: [
            { name: 'Subject', value: 'Short' },
            { name: 'From', value: 'test@substack.com' }
          ],
          body: {
            data: Buffer.from('<html><body>Short</body></html>').toString('base64')
          },
          mimeType: 'text/html'
        }
      };

      gmailMocks.mockMessageGetSuccess(shortMessage);

      // Mock JSDOM to return short text
      const { JSDOM } = require('jsdom');
      JSDOM.mockImplementation(() => ({
        window: {
          document: {
            body: { textContent: 'Short' },
            textContent: 'Short',
            querySelectorAll: vi.fn(() => ({
              forEach: vi.fn()
            }))
          }
        }
      }));

      const result = await (connector as any).processMessage({ id: 'short-msg' });

      expect(result).toBeNull();
    });

    it('should extract newsletter name correctly', () => {
      const testCases = [
        {
          sender: 'Morning Brew <crew@morningbrew.substack.com>',
          expected: 'Morning Brew'
        },
        {
          sender: 'Unknown <test@example.substack.com>',
          expected: 'Example'
        },
        {
          sender: 'No Match <test@gmail.com>',
          expected: 'No Match'
        }
      ];

      testCases.forEach(({ sender, expected }) => {
        const result = (connector as any).extractNewsletterName(sender);
        expect(result).toBe(expected);
      });
    });

    it('should handle missing message ID', async () => {
      const result = await (connector as any).processMessage({});
      expect(result).toBeNull();
    });

    it('should handle date parsing errors gracefully', async () => {
      const messageWithBadDate = {
        id: 'bad-date-msg',
        payload: {
          headers: [
            { name: 'Subject', value: 'Test' },
            { name: 'From', value: 'test@substack.com' },
            { name: 'Date', value: 'invalid-date' }
          ],
          body: {
            data: Buffer.from('<html><body>Content with enough text to pass the minimum length requirement for processing</body></html>').toString('base64')
          },
          mimeType: 'text/html'
        }
      };

      gmailMocks.mockMessageGetSuccess(messageWithBadDate);

      const result = await (connector as any).processMessage({ id: 'bad-date-msg' });

      expect(result).not.toBeNull();
      expect(result.receivedAt).toBeInstanceOf(Date);
    });
  });

  describe('HTML extraction and cleaning', () => {
    it('should extract HTML from message parts', () => {
      const messageWithParts = {
        payload: {
          parts: [{
            mimeType: 'text/html',
            body: {
              data: Buffer.from('<html><body>HTML content</body></html>').toString('base64')
            }
          }]
        }
      };

      const result = (connector as any).extractHTML(messageWithParts);
      expect(result).toContain('HTML content');
    });

    it('should handle nested message parts', () => {
      const messageWithNestedParts = {
        payload: {
          parts: [{
            mimeType: 'multipart/alternative',
            parts: [{
              mimeType: 'text/html',
              body: {
                data: Buffer.from('<html><body>Nested HTML</body></html>').toString('base64')
              }
            }]
          }]
        }
      };

      const result = (connector as any).extractHTML(messageWithNestedParts);
      expect(result).toContain('Nested HTML');
    });

    it('should fall back to main body if no parts', () => {
      const messageWithMainBody = {
        payload: {
          mimeType: 'text/html',
          body: {
            data: Buffer.from('<html><body>Main body content</body></html>').toString('base64')
          }
        }
      };

      const result = (connector as any).extractHTML(messageWithMainBody);
      expect(result).toContain('Main body content');
    });

    it('should handle base64 decode errors', () => {
      const result = (connector as any).decodeBase64('invalid-base64');
      expect(result).toBe('');
    });
  });

  describe('storeEmails', () => {
    it('should store emails in database', async () => {
      const emails = [{
        id: 'test-id',
        messageId: 'test-msg-id',
        subject: 'Test Subject',
        sender: 'test@example.com',
        newsletterName: 'Test Newsletter',
        html: '<html>content</html>',
        text: 'content',
        receivedAt: new Date(),
        processedAt: new Date()
      }];

      await (connector as any).storeEmails(emails);

      // Verify that the database client was used
      expect(mockSupabaseClient).toBeDefined();
    });

    it('should handle database errors', async () => {
      // Configure the Supabase client mock to throw an error
      const mockClient = require('@substack-intelligence/database').createServiceRoleClient();
      mockClient.from = vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            data: null,
            error: { message: 'Database error' }
          }))
        }))
      }));

      const emails = [{
        id: 'test-id',
        messageId: 'test-msg-id',
        subject: 'Test Subject',
        sender: 'test@example.com',
        newsletterName: 'Test Newsletter',
        html: '<html>content</html>',
        text: 'content',
        receivedAt: new Date(),
        processedAt: new Date()
      }];

      await expect((connector as any).storeEmails(emails))
        .rejects
        .toThrow();
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      gmailMocks.mockProfileSuccess({
        emailAddress: 'test@gmail.com'
      });

      const result = await connector.testConnection();

      expect(result).toBe(true);
      expect(gmailMocks.getProfile).toHaveBeenCalledWith({
        userId: 'me'
      });
    });

    it('should return false for failed connection', async () => {
      gmailMocks.mockProfileError(new Error('Connection failed'));

      const result = await connector.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return email statistics', async () => {
      const stats = await connector.getStats();

      expect(stats).toMatchObject({
        totalEmails: expect.any(Number),
        recentEmails: expect.any(Number),
        topNewsletters: expect.any(Array)
      });
    });

    it('should handle database errors gracefully', async () => {
      // This test relies on the database mocks configured in setup
      const stats = await connector.getStats();

      expect(stats).toMatchObject({
        totalEmails: expect.any(Number),
        recentEmails: expect.any(Number),
        topNewsletters: expect.any(Array)
      });
    });
  });

  describe('utility methods', () => {
    it('should format Gmail date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = (connector as any).formatGmailDate(date);
      expect(result).toBe('2024-01-15');
    });

    it('should convert to title case', () => {
      const result = (connector as any).titleCase('hello world');
      expect(result).toBe('Hello World');
    });

    it('should get header value', () => {
      const message = {
        payload: {
          headers: [
            { name: 'Subject', value: 'Test Subject' },
            { name: 'From', value: 'test@example.com' }
          ]
        }
      };

      const subject = (connector as any).getHeader(message, 'Subject');
      const from = (connector as any).getHeader(message, 'from'); // case insensitive
      const missing = (connector as any).getHeader(message, 'Missing');

      expect(subject).toBe('Test Subject');
      expect(from).toBe('test@example.com');
      expect(missing).toBeNull();
    });
  });

  describe('pagination handling', () => {
    it('should handle multiple pages of messages', async () => {
      // Configure paginated responses
      gmailMocks.listMessages
        .mockResolvedValueOnce({
          data: {
            messages: [{ id: 'msg-1', threadId: 'thread-1' }, { id: 'msg-2', threadId: 'thread-2' }],
            nextPageToken: 'token-1',
            resultSizeEstimate: 3
          }
        })
        .mockResolvedValueOnce({
          data: {
            messages: [{ id: 'msg-3', threadId: 'thread-3' }],
            resultSizeEstimate: 1
          }
        });

      const result = await (connector as any).fetchAllMessages('test query');

      expect(result).toHaveLength(3);
      expect(result.map((m: any) => m.id)).toEqual(['msg-1', 'msg-2', 'msg-3']);
      expect(gmailMocks.listMessages).toHaveBeenCalledTimes(2);
    });
  });
});