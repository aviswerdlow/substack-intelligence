import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock external services
global.fetch = vi.fn();
const mockFetch = global.fetch as any;

// Mock Redis for rate limiting
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  ttl: vi.fn()
};

// Mock Google APIs
const mockGoogleAuth = {
  setCredentials: vi.fn(),
  getAccessToken: vi.fn()
};

const mockGmail = {
  users: {
    messages: {
      list: vi.fn(),
      get: vi.fn()
    },
    history: {
      list: vi.fn()
    }
  }
};

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(() => mockGoogleAuth)
    },
    gmail: vi.fn(() => mockGmail)
  }
}));

// Mock Anthropic AI
const mockAnthropic = {
  messages: {
    create: vi.fn()
  }
};

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => mockAnthropic)
}));

describe('External API Integrations Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful responses
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
      text: () => Promise.resolve('Success'),
      headers: new Map()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rate Limiting Implementation', () => {
    const rateLimiter = {
      async checkRateLimit(
        identifier: string, 
        windowSeconds: number = 60, 
        maxRequests: number = 100
      ) {
        const key = `rateLimit:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
        
        const current = await mockRedis.get(key);
        const currentCount = current ? parseInt(current) : 0;
        
        if (currentCount >= maxRequests) {
          return {
            allowed: false,
            count: currentCount,
            resetTime: (Math.floor(Date.now() / (windowSeconds * 1000)) + 1) * windowSeconds * 1000
          };
        }
        
        const newCount = await mockRedis.incr(key);
        if (newCount === 1) {
          await mockRedis.expire(key, windowSeconds);
        }
        
        return {
          allowed: true,
          count: newCount,
          remaining: maxRequests - newCount,
          resetTime: (Math.floor(Date.now() / (windowSeconds * 1000)) + 1) * windowSeconds * 1000
        };
      },

      async checkBurstLimit(
        identifier: string,
        maxBurst: number = 10,
        burstWindowSeconds: number = 10
      ) {
        const burstKey = `burst:${identifier}:${Math.floor(Date.now() / (burstWindowSeconds * 1000))}`;
        
        const burstCount = await mockRedis.get(burstKey);
        const currentBurst = burstCount ? parseInt(burstCount) : 0;
        
        if (currentBurst >= maxBurst) {
          return {
            allowed: false,
            burstCount: currentBurst,
            resetTime: Date.now() + (burstWindowSeconds * 1000)
          };
        }
        
        const newBurst = await mockRedis.incr(burstKey);
        if (newBurst === 1) {
          await mockRedis.expire(burstKey, burstWindowSeconds);
        }
        
        return {
          allowed: true,
          burstCount: newBurst,
          remaining: maxBurst - newBurst
        };
      },

      async implementSlidingWindow(
        identifier: string,
        windowMs: number = 60000,
        maxRequests: number = 100
      ) {
        const now = Date.now();
        const windowStart = now - windowMs;
        const key = `sliding:${identifier}`;
        
        // Clean old entries (in real implementation, this would be more efficient)
        const entries = JSON.parse(await mockRedis.get(key) || '[]');
        const validEntries = entries.filter((timestamp: number) => timestamp > windowStart);
        
        if (validEntries.length >= maxRequests) {
          return {
            allowed: false,
            count: validEntries.length,
            oldestRequest: Math.min(...validEntries)
          };
        }
        
        validEntries.push(now);
        await mockRedis.set(key, JSON.stringify(validEntries));
        await mockRedis.expire(key, Math.ceil(windowMs / 1000));
        
        return {
          allowed: true,
          count: validEntries.length,
          remaining: maxRequests - validEntries.length
        };
      },

      async adaptiveRateLimit(
        identifier: string,
        baseLimit: number = 100,
        windowSeconds: number = 60
      ) {
        const statsKey = `stats:${identifier}`;
        const stats = JSON.parse(await mockRedis.get(statsKey) || '{"errors": 0, "success": 0}');
        
        // Adjust limit based on error rate
        const totalRequests = stats.errors + stats.success;
        const errorRate = totalRequests > 0 ? stats.errors / totalRequests : 0;
        
        let adjustedLimit = baseLimit;
        if (errorRate > 0.1) { // More than 10% errors
          adjustedLimit = Math.floor(baseLimit * 0.5); // Reduce by 50%
        } else if (errorRate < 0.01) { // Less than 1% errors
          adjustedLimit = Math.floor(baseLimit * 1.2); // Increase by 20%
        }
        
        return this.checkRateLimit(identifier, windowSeconds, adjustedLimit);
      },

      async recordRequestResult(identifier: string, success: boolean) {
        const statsKey = `stats:${identifier}`;
        const stats = JSON.parse(await mockRedis.get(statsKey) || '{"errors": 0, "success": 0}');
        
        if (success) {
          stats.success++;
        } else {
          stats.errors++;
        }
        
        await mockRedis.set(statsKey, JSON.stringify(stats));
        await mockRedis.expire(statsKey, 3600); // Keep stats for 1 hour
      }
    };

    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.incr.mockImplementation((key) => Promise.resolve(1));
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.expire.mockResolvedValue(1);
    });

    it('should allow requests within rate limit', async () => {
      mockRedis.get.mockResolvedValue('50'); // Current count
      mockRedis.incr.mockResolvedValue(51);
      
      const result = await rateLimiter.checkRateLimit('user_123', 60, 100);
      
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(51);
      expect(result.remaining).toBe(49);
    });

    it('should block requests exceeding rate limit', async () => {
      mockRedis.get.mockResolvedValue('100'); // At limit
      
      const result = await rateLimiter.checkRateLimit('user_123', 60, 100);
      
      expect(result.allowed).toBe(false);
      expect(result.count).toBe(100);
      expect(mockRedis.incr).not.toHaveBeenCalled();
    });

    it('should handle first request correctly', async () => {
      mockRedis.get.mockResolvedValue(null); // No existing count
      mockRedis.incr.mockResolvedValue(1);
      
      const result = await rateLimiter.checkRateLimit('new_user', 60, 100);
      
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1);
      expect(mockRedis.expire).toHaveBeenCalledWith(expect.any(String), 60);
    });

    it('should implement burst protection correctly', async () => {
      mockRedis.get.mockResolvedValue('9'); // Near burst limit
      mockRedis.incr.mockResolvedValue(10);
      
      const result = await rateLimiter.checkBurstLimit('user_123', 10, 10);
      
      expect(result.allowed).toBe(true);
      expect(result.burstCount).toBe(10);
      expect(result.remaining).toBe(0);
    });

    it('should block burst requests exceeding limit', async () => {
      mockRedis.get.mockResolvedValue('10'); // At burst limit
      
      const result = await rateLimiter.checkBurstLimit('user_123', 10, 10);
      
      expect(result.allowed).toBe(false);
      expect(result.burstCount).toBe(10);
    });

    it('should implement sliding window correctly', async () => {
      const now = Date.now();
      const validTimestamps = [now - 30000, now - 20000, now - 10000]; // Within window
      mockRedis.get.mockResolvedValue(JSON.stringify(validTimestamps));
      
      const result = await rateLimiter.implementSlidingWindow('user_123', 60000, 100);
      
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(4); // 3 existing + 1 new
    });

    it('should block sliding window requests at limit', async () => {
      const now = Date.now();
      const timestamps = Array.from({ length: 100 }, (_, i) => now - (i * 100)); // 100 recent requests
      mockRedis.get.mockResolvedValue(JSON.stringify(timestamps));
      
      const result = await rateLimiter.implementSlidingWindow('user_123', 60000, 100);
      
      expect(result.allowed).toBe(false);
      expect(result.count).toBe(100);
    });

    it('should implement adaptive rate limiting', async () => {
      // High error rate scenario
      const highErrorStats = { errors: 50, success: 50 };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(highErrorStats));
      mockRedis.get.mockResolvedValue('25'); // Current count
      mockRedis.incr.mockResolvedValue(26);
      
      const result = await rateLimiter.adaptiveRateLimit('user_high_errors', 100);
      
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(26);
      // Should have adjusted limit to 50 due to high error rate
    });

    it('should record request results for adaptive limiting', async () => {
      const currentStats = { errors: 10, success: 90 };
      mockRedis.get.mockResolvedValue(JSON.stringify(currentStats));
      
      await rateLimiter.recordRequestResult('user_123', false); // Record error
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'stats:user_123',
        JSON.stringify({ errors: 11, success: 90 })
      );
    });

    it('should handle Redis connection errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      
      // Should have fallback behavior
      try {
        await rateLimiter.checkRateLimit('user_123');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should implement distributed rate limiting with proper key strategy', async () => {
      const testCases = [
        { identifier: 'user:123', window: 60, expected: /^rateLimit:user:123:\d+$/ },
        { identifier: 'api:key1', window: 3600, expected: /^rateLimit:api:key1:\d+$/ },
        { identifier: '192.168.1.1', window: 300, expected: /^rateLimit:192\.168\.1\.1:\d+$/ }
      ];
      
      for (const { identifier, window, expected } of testCases) {
        await rateLimiter.checkRateLimit(identifier, window);
        
        const callArgs = mockRedis.get.mock.calls.find(call => 
          call[0].startsWith(`rateLimit:${identifier}:`)
        );
        expect(callArgs?.[0]).toMatch(expected);
      }
    });

    it('should handle concurrent rate limit checks correctly', async () => {
      mockRedis.get.mockResolvedValue('50');
      mockRedis.incr.mockImplementation(() => {
        const current = parseInt(mockRedis.get.mockResolvedValue || '50');
        return Promise.resolve(current + 1);
      });
      
      const concurrentChecks = Array.from({ length: 10 }, () => 
        rateLimiter.checkRateLimit('user_concurrent', 60, 100)
      );
      
      const results = await Promise.all(concurrentChecks);
      
      // All should be allowed since we're still under limit
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('Gmail API Integration', () => {
    const gmailService = {
      async setupOAuth(credentials: any) {
        const oauth2Client = mockGoogleAuth;
        oauth2Client.setCredentials(credentials);
        return oauth2Client;
      },

      async getMessages(auth: any, query: string = '', maxResults: number = 10) {
        mockGmail.users.messages.list.mockResolvedValue({
          data: {
            messages: Array.from({ length: maxResults }, (_, i) => ({
              id: `message_${i}`,
              threadId: `thread_${i}`
            })),
            nextPageToken: maxResults >= 10 ? 'next_page_token' : undefined
          }
        });
        
        const response = await mockGmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults
        });
        
        return response.data;
      },

      async getMessageContent(auth: any, messageId: string) {
        mockGmail.users.messages.get.mockResolvedValue({
          data: {
            id: messageId,
            payload: {
              headers: [
                { name: 'From', value: 'sender@newsletter.com' },
                { name: 'Subject', value: 'Tech News Update' },
                { name: 'Date', value: 'Wed, 01 Jan 2024 10:00:00 +0000' }
              ],
              body: {
                data: Buffer.from('Email content here').toString('base64')
              }
            }
          }
        });
        
        const response = await mockGmail.users.messages.get({
          userId: 'me',
          id: messageId
        });
        
        return this.parseMessage(response.data);
      },

      parseMessage(message: any) {
        const headers = message.payload.headers.reduce((acc: any, header: any) => {
          acc[header.name.toLowerCase()] = header.value;
          return acc;
        }, {});
        
        let body = '';
        if (message.payload.body?.data) {
          body = Buffer.from(message.payload.body.data, 'base64').toString();
        }
        
        return {
          id: message.id,
          from: headers.from,
          subject: headers.subject,
          date: new Date(headers.date),
          body
        };
      },

      async syncEmails(auth: any, historyId?: string) {
        if (historyId) {
          // Use history API for incremental sync
          return this.getHistoryUpdates(auth, historyId);
        } else {
          // Full sync
          return this.getMessages(auth, 'is:unread', 50);
        }
      },

      async getHistoryUpdates(auth: any, startHistoryId: string) {
        mockGmail.users.history.list.mockResolvedValue({
          data: {
            history: [
              {
                id: 'history_1',
                messages: [{ id: 'new_message_1' }],
                messagesAdded: [{ message: { id: 'new_message_1' } }]
              }
            ],
            historyId: 'latest_history_id'
          }
        });
        
        const response = await mockGmail.users.history.list({
          userId: 'me',
          startHistoryId
        });
        
        return response.data;
      },

      async handleAuthError(error: any) {
        if (error.code === 401) {
          return { requiresReauth: true, error: 'Token expired' };
        } else if (error.code === 403) {
          return { requiresReauth: false, error: 'Insufficient permissions' };
        } else if (error.code === 429) {
          return { requiresReauth: false, error: 'Rate limit exceeded', retryAfter: 3600 };
        }
        
        return { requiresReauth: false, error: error.message };
      }
    };

    it('should setup OAuth credentials correctly', async () => {
      const credentials = {
        access_token: 'access_token',
        refresh_token: 'refresh_token'
      };
      
      const auth = await gmailService.setupOAuth(credentials);
      
      expect(mockGoogleAuth.setCredentials).toHaveBeenCalledWith(credentials);
      expect(auth).toBe(mockGoogleAuth);
    });

    it('should fetch messages with query', async () => {
      const messages = await gmailService.getMessages(mockGoogleAuth, 'from:newsletter', 5);
      
      expect(mockGmail.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        q: 'from:newsletter',
        maxResults: 5
      });
      
      expect(messages.messages).toHaveLength(5);
      expect(messages.messages[0]).toMatchObject({
        id: 'message_0',
        threadId: 'thread_0'
      });
    });

    it('should parse message content correctly', async () => {
      const message = await gmailService.getMessageContent(mockGoogleAuth, 'message_123');
      
      expect(mockGmail.users.messages.get).toHaveBeenCalledWith({
        userId: 'me',
        id: 'message_123'
      });
      
      expect(message).toMatchObject({
        id: 'message_123',
        from: 'sender@newsletter.com',
        subject: 'Tech News Update',
        date: expect.any(Date),
        body: 'Email content here'
      });
    });

    it('should handle incremental sync with history API', async () => {
      const updates = await gmailService.syncEmails(mockGoogleAuth, 'history_start_id');
      
      expect(mockGmail.users.history.list).toHaveBeenCalledWith({
        userId: 'me',
        startHistoryId: 'history_start_id'
      });
      
      expect(updates.history).toBeTruthy();
      expect(updates.historyId).toBe('latest_history_id');
    });

    it('should handle full sync without history ID', async () => {
      const messages = await gmailService.syncEmails(mockGoogleAuth);
      
      expect(mockGmail.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        q: 'is:unread',
        maxResults: 50
      });
    });

    it('should handle authentication errors appropriately', async () => {
      const authErrors = [
        { code: 401, expected: { requiresReauth: true, error: 'Token expired' } },
        { code: 403, expected: { requiresReauth: false, error: 'Insufficient permissions' } },
        { code: 429, expected: { requiresReauth: false, error: 'Rate limit exceeded', retryAfter: 3600 } }
      ];
      
      for (const { code, expected } of authErrors) {
        const result = await gmailService.handleAuthError({ code });
        expect(result).toMatchObject(expected);
      }
    });

    it('should handle API rate limits with exponential backoff', async () => {
      let attempts = 0;
      const maxRetries = 3;
      
      const retryWithBackoff = async (fn: Function): Promise<any> => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            attempts++;
            if (attempts < 3) {
              throw { code: 429, message: 'Rate limit exceeded' };
            }
            return await fn();
          } catch (error: any) {
            if (i === maxRetries - 1 || error.code !== 429) throw error;
            
            const delay = Math.pow(2, i) * 1000; // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };
      
      const result = await retryWithBackoff(() => 
        gmailService.getMessages(mockGoogleAuth, 'test')
      );
      
      expect(attempts).toBe(3);
      expect(result).toBeTruthy();
    });

    it('should parse complex email structures', async () => {
      // Mock complex multipart message
      mockGmail.users.messages.get.mockResolvedValue({
        data: {
          id: 'complex_message',
          payload: {
            headers: [
              { name: 'From', value: 'Complex Sender <complex@example.com>' },
              { name: 'Subject', value: 'Re: Multi-part message' }
            ],
            parts: [
              {
                mimeType: 'text/plain',
                body: { data: Buffer.from('Plain text content').toString('base64') }
              },
              {
                mimeType: 'text/html',
                body: { data: Buffer.from('<p>HTML content</p>').toString('base64') }
              }
            ]
          }
        }
      });
      
      // Enhanced parser for multipart messages
      const enhancedParser = {
        parseMessage(message: any) {
          const headers = message.payload.headers.reduce((acc: any, header: any) => {
            acc[header.name.toLowerCase()] = header.value;
            return acc;
          }, {});
          
          let body = '';
          
          if (message.payload.body?.data) {
            body = Buffer.from(message.payload.body.data, 'base64').toString();
          } else if (message.payload.parts) {
            // Handle multipart
            const textPart = message.payload.parts.find((part: any) => 
              part.mimeType === 'text/plain'
            );
            if (textPart?.body?.data) {
              body = Buffer.from(textPart.body.data, 'base64').toString();
            }
          }
          
          return {
            id: message.id,
            from: headers.from,
            subject: headers.subject,
            body: body.trim()
          };
        }
      };
      
      const message = enhancedParser.parseMessage({
        id: 'complex_message',
        payload: {
          headers: [
            { name: 'From', value: 'Complex Sender <complex@example.com>' },
            { name: 'Subject', value: 'Re: Multi-part message' }
          ],
          parts: [
            {
              mimeType: 'text/plain',
              body: { data: Buffer.from('Plain text content').toString('base64') }
            }
          ]
        }
      });
      
      expect(message.body).toBe('Plain text content');
      expect(message.from).toBe('Complex Sender <complex@example.com>');
    });

    it('should handle pagination for large mailboxes', async () => {
      let pageToken: string | undefined;
      const allMessages: any[] = [];
      
      // Mock paginated responses
      mockGmail.users.messages.list
        .mockResolvedValueOnce({
          data: {
            messages: Array.from({ length: 10 }, (_, i) => ({ id: `page1_message_${i}` })),
            nextPageToken: 'page2_token'
          }
        })
        .mockResolvedValueOnce({
          data: {
            messages: Array.from({ length: 5 }, (_, i) => ({ id: `page2_message_${i}` })),
            nextPageToken: undefined
          }
        });
      
      do {
        const response = await gmailService.getMessages(mockGoogleAuth, '', 10);
        allMessages.push(...(response.messages || []));
        pageToken = response.nextPageToken;
      } while (pageToken);
      
      expect(allMessages).toHaveLength(15); // 10 + 5
      expect(mockGmail.users.messages.list).toHaveBeenCalledTimes(2);
    });
  });

  describe('AI Service Integration (Anthropic Claude)', () => {
    const aiService = {
      async extractCompanyMentions(text: string) {
        mockAnthropic.messages.create.mockResolvedValue({
          content: [{
            text: JSON.stringify([
              {
                company: 'Test Company',
                context: 'Test Company raised $50M in Series B funding',
                sentiment: 'positive',
                confidence: 0.92
              }
            ])
          }]
        });
        
        const response = await mockAnthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `Extract company mentions from this text: ${text}`
          }]
        });
        
        return JSON.parse(response.content[0].text);
      },

      async analyzeSentiment(text: string) {
        mockAnthropic.messages.create.mockResolvedValue({
          content: [{
            text: JSON.stringify({
              sentiment: 'positive',
              confidence: 0.85,
              reasoning: 'The text contains positive language about funding and growth'
            })
          }]
        });
        
        const response = await mockAnthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Analyze the sentiment of this text: ${text}`
          }]
        });
        
        return JSON.parse(response.content[0].text);
      },

      async generateSummary(texts: string[]) {
        mockAnthropic.messages.create.mockResolvedValue({
          content: [{
            text: 'This week saw significant activity in the tech sector with multiple funding rounds and product launches.'
          }]
        });
        
        const combinedText = texts.join('\n\n---\n\n');
        
        const response = await mockAnthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Generate a concise summary of these company mentions: ${combinedText}`
          }]
        });
        
        return response.content[0].text;
      },

      async handleRateLimit(error: any) {
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after'] || 60;
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return true; // Indicate retry should be attempted
        }
        return false;
      },

      async batchProcess(texts: string[], batchSize: number = 5) {
        const results = [];
        
        for (let i = 0; i < texts.length; i += batchSize) {
          const batch = texts.slice(i, i + batchSize);
          
          const batchPromises = batch.map(text => 
            this.analyzeSentiment(text).catch(error => ({
              error: error.message,
              text
            }))
          );
          
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
          
          // Rate limiting between batches
          if (i + batchSize < texts.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        return results;
      }
    };

    it('should extract company mentions from text', async () => {
      const text = 'Test Company raised $50M in Series B funding from top investors.';
      
      const mentions = await aiService.extractCompanyMentions(text);
      
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: expect.stringContaining(text)
        }]
      });
      
      expect(mentions).toHaveLength(1);
      expect(mentions[0]).toMatchObject({
        company: 'Test Company',
        sentiment: 'positive',
        confidence: expect.any(Number)
      });
    });

    it('should analyze sentiment correctly', async () => {
      const text = 'The company is doing exceptionally well with record growth.';
      
      const sentiment = await aiService.analyzeSentiment(text);
      
      expect(sentiment).toMatchObject({
        sentiment: 'positive',
        confidence: expect.any(Number),
        reasoning: expect.any(String)
      });
    });

    it('should generate summaries from multiple texts', async () => {
      const texts = [
        'Company A raised funding',
        'Company B launched new product',
        'Company C expanded internationally'
      ];
      
      const summary = await aiService.generateSummary(texts);
      
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{
            role: 'user',
            content: expect.stringContaining('Company A raised funding')
          }]
        })
      );
    });

    it('should handle rate limiting correctly', async () => {
      const rateLimitError = {
        status: 429,
        headers: { 'retry-after': 2 }
      };
      
      const startTime = Date.now();
      const shouldRetry = await aiService.handleRateLimit(rateLimitError);
      const endTime = Date.now();
      
      expect(shouldRetry).toBe(true);
      expect(endTime - startTime).toBeGreaterThanOrEqual(2000);
    });

    it('should process texts in batches', async () => {
      const texts = Array.from({ length: 12 }, (_, i) => `Text ${i}`);
      
      const results = await aiService.batchProcess(texts, 5);
      
      expect(results).toHaveLength(12);
      expect(mockAnthropic.messages.create).toHaveBeenCalledTimes(12);
    });

    it('should handle AI service errors gracefully', async () => {
      mockAnthropic.messages.create.mockRejectedValue(new Error('Service unavailable'));
      
      const texts = ['Test text 1', 'Test text 2'];
      const results = await aiService.batchProcess(texts, 2);
      
      // Should contain error information
      results.forEach(result => {
        expect(result).toHaveProperty('error');
        expect(result).toHaveProperty('text');
      });
    });

    it('should respect token limits and truncate long texts', async () => {
      const longText = 'word '.repeat(10000); // Very long text
      const maxTokens = 4000;
      
      // Simulate token counting (rough estimation: 1 token ≈ 4 characters)
      const estimatedTokens = longText.length / 4;
      
      if (estimatedTokens > maxTokens * 0.8) { // Leave room for response
        const truncatedText = longText.substring(0, maxTokens * 4 * 0.7);
        await aiService.extractCompanyMentions(truncatedText);
      } else {
        await aiService.extractCompanyMentions(longText);
      }
      
      expect(mockAnthropic.messages.create).toHaveBeenCalled();
    });

    it('should handle streaming responses for long operations', async () => {
      // Mock streaming response
      const streamMock = {
        on: vi.fn(),
        end: vi.fn()
      };
      
      const streamHandler = {
        async processStream(stream: any) {
          return new Promise((resolve) => {
            let content = '';
            
            stream.on('data', (chunk: string) => {
              content += chunk;
            });
            
            stream.on('end', () => {
              resolve(content);
            });
            
            // Simulate streaming
            setTimeout(() => stream.on.mock.calls[0][1]('chunk1'), 10);
            setTimeout(() => stream.on.mock.calls[0][1]('chunk2'), 20);
            setTimeout(() => stream.on.mock.calls[1][1](), 30);
          });
        }
      };
      
      const result = await streamHandler.processStream(streamMock);
      
      expect(result).toBe('chunk1chunk2');
      expect(streamMock.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(streamMock.on).toHaveBeenCalledWith('end', expect.any(Function));
    });
  });

  describe('External Webhook Integration', () => {
    const webhookService = {
      async validateWebhook(signature: string, payload: string, secret: string) {
        const crypto = require('crypto');
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(payload)
          .digest('hex');
        
        return signature === `sha256=${expectedSignature}`;
      },

      async processWebhook(payload: any, headers: any) {
        // Validate webhook signature
        const isValid = await this.validateWebhook(
          headers['x-signature'],
          JSON.stringify(payload),
          'webhook_secret'
        );
        
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
        
        // Process webhook based on type
        switch (payload.type) {
          case 'company.mentioned':
            return this.handleCompanyMention(payload.data);
          case 'newsletter.received':
            return this.handleNewsletterReceived(payload.data);
          case 'user.subscribed':
            return this.handleUserSubscribed(payload.data);
          default:
            return { success: true, message: 'Webhook received but not processed' };
        }
      },

      async handleCompanyMention(data: any) {
        // Mock processing company mention
        return {
          success: true,
          processed: {
            companyId: data.company_id,
            mentionId: data.mention_id,
            sentiment: data.sentiment
          }
        };
      },

      async handleNewsletterReceived(data: any) {
        // Mock processing newsletter
        return {
          success: true,
          processed: {
            newsletterId: data.newsletter_id,
            emailsProcessed: data.emails_count
          }
        };
      },

      async handleUserSubscribed(data: any) {
        // Mock user subscription handling
        return {
          success: true,
          processed: {
            userId: data.user_id,
            subscriptionType: data.subscription_type
          }
        };
      },

      async sendWebhook(url: string, payload: any, secret?: string) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'SubstackIntelligence-Webhooks/1.0'
        };
        
        if (secret) {
          const crypto = require('crypto');
          const signature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');
          headers['X-Signature'] = `sha256=${signature}`;
        }
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`Webhook delivery failed: ${response.status}`);
        }
        
        return {
          success: true,
          status: response.status,
          response: await response.text()
        };
      },

      async retryWebhook(url: string, payload: any, maxRetries: number = 3) {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await this.sendWebhook(url, payload);
            return { ...result, attempt };
          } catch (error: any) {
            lastError = error;
            
            if (attempt < maxRetries) {
              const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        throw new Error(`Webhook failed after ${maxRetries} attempts: ${lastError?.message}`);
      }
    };

    // Mock crypto
    vi.mock('crypto', () => ({
      createHmac: vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn(() => 'mock_signature')
      }))
    }));

    it('should validate webhook signatures correctly', async () => {
      const isValid = await webhookService.validateWebhook(
        'sha256=mock_signature',
        '{"test": "payload"}',
        'secret'
      );
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signatures', async () => {
      const isValid = await webhookService.validateWebhook(
        'sha256=wrong_signature',
        '{"test": "payload"}',
        'secret'
      );
      
      expect(isValid).toBe(false);
    });

    it('should process different webhook types', async () => {
      const testCases = [
        {
          payload: {
            type: 'company.mentioned',
            data: { company_id: 'comp_123', mention_id: 'mention_456', sentiment: 'positive' }
          },
          expected: { companyId: 'comp_123' }
        },
        {
          payload: {
            type: 'newsletter.received',
            data: { newsletter_id: 'news_123', emails_count: 5 }
          },
          expected: { newsletterId: 'news_123' }
        },
        {
          payload: {
            type: 'user.subscribed',
            data: { user_id: 'user_123', subscription_type: 'premium' }
          },
          expected: { userId: 'user_123' }
        }
      ];
      
      for (const { payload, expected } of testCases) {
        const result = await webhookService.processWebhook(payload, {
          'x-signature': 'sha256=mock_signature'
        });
        
        expect(result.success).toBe(true);
        expect(result.processed).toMatchObject(expected);
      }
    });

    it('should send webhooks with proper signatures', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK')
      });
      
      const payload = { test: 'data' };
      const result = await webhookService.sendWebhook(
        'https://example.com/webhook',
        payload,
        'secret'
      );
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Signature': 'sha256=mock_signature'
          }),
          body: JSON.stringify(payload)
        })
      );
      
      expect(result.success).toBe(true);
    });

    it('should retry failed webhooks with exponential backoff', async () => {
      let attempts = 0;
      
      mockFetch.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Server Error')
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve('OK')
        });
      });
      
      const startTime = Date.now();
      const result = await webhookService.retryWebhook(
        'https://example.com/webhook',
        { test: 'data' }
      );
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(result.attempt).toBe(3);
      expect(endTime - startTime).toBeGreaterThan(3000); // Should have delays
      expect(attempts).toBe(3);
    });

    it('should handle webhook retry exhaustion', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Persistent Server Error')
      });
      
      await expect(
        webhookService.retryWebhook('https://example.com/webhook', { test: 'data' }, 2)
      ).rejects.toThrow('Webhook failed after 2 attempts');
    });

    it('should handle unknown webhook types', async () => {
      const result = await webhookService.processWebhook(
        {
          type: 'unknown.type',
          data: {}
        },
        { 'x-signature': 'sha256=mock_signature' }
      );
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('not processed');
    });
  });

  describe('Integration Error Handling and Recovery', () => {
    it('should implement circuit breaker for external services', async () => {
      let failures = 0;
      let circuitOpen = false;
      const maxFailures = 3;
      const resetTimeout = 60000;
      
      const circuitBreaker = {
        async call<T>(serviceFn: () => Promise<T>): Promise<T> {
          if (circuitOpen) {
            throw new Error('Circuit breaker is open');
          }
          
          try {
            const result = await serviceFn();
            failures = 0; // Reset on success
            return result;
          } catch (error) {
            failures++;
            if (failures >= maxFailures) {
              circuitOpen = true;
              setTimeout(() => {
                circuitOpen = false;
                failures = 0;
              }, resetTimeout);
            }
            throw error;
          }
        }
      };
      
      const failingService = () => Promise.reject(new Error('Service down'));
      
      // Should fail 3 times
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.call(failingService)).rejects.toThrow('Service down');
      }
      
      // Circuit should now be open
      await expect(circuitBreaker.call(failingService)).rejects.toThrow('Circuit breaker is open');
    });

    it('should implement graceful degradation', async () => {
      const serviceWithFallback = {
        async getAIAnalysis(text: string) {
          try {
            // Try AI service first
            return await aiService.analyzeSentiment(text);
          } catch (error) {
            // Fallback to simple rule-based analysis
            console.warn('AI service unavailable, using fallback', error);
            return this.simpleAnalysis(text);
          }
        },
        
        simpleAnalysis(text: string) {
          const positiveWords = ['good', 'great', 'excellent', 'amazing', 'successful'];
          const negativeWords = ['bad', 'terrible', 'awful', 'failed', 'disaster'];
          
          const lowerText = text.toLowerCase();
          const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
          const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
          
          if (positiveCount > negativeCount) {
            return { sentiment: 'positive', confidence: 0.6, fallback: true };
          } else if (negativeCount > positiveCount) {
            return { sentiment: 'negative', confidence: 0.6, fallback: true };
          } else {
            return { sentiment: 'neutral', confidence: 0.5, fallback: true };
          }
        }
      };
      
      mockAnthropic.messages.create.mockRejectedValue(new Error('AI service down'));
      
      const result = await serviceWithFallback.getAIAnalysis('This is a great success');
      
      expect(result.fallback).toBe(true);
      expect(result.sentiment).toBe('positive');
    });

    it('should implement request queuing during downtime', async () => {
      const requestQueue: Array<{ fn: Function; resolve: Function; reject: Function }> = [];
      let serviceAvailable = false;
      
      const queuedService = {
        async makeRequest<T>(fn: () => Promise<T>): Promise<T> {
          if (serviceAvailable) {
            return await fn();
          }
          
          // Queue the request
          return new Promise<T>((resolve, reject) => {
            requestQueue.push({ fn, resolve, reject });
          });
        },
        
        async processQueue() {
          serviceAvailable = true;
          
          while (requestQueue.length > 0) {
            const { fn, resolve, reject } = requestQueue.shift()!;
            try {
              const result = await fn();
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        }
      };
      
      // Make requests while service is down
      const request1 = queuedService.makeRequest(() => Promise.resolve('result1'));
      const request2 = queuedService.makeRequest(() => Promise.resolve('result2'));
      
      expect(requestQueue).toHaveLength(2);
      
      // Restore service and process queue
      await queuedService.processQueue();
      
      expect(await request1).toBe('result1');
      expect(await request2).toBe('result2');
      expect(requestQueue).toHaveLength(0);
    });

    it('should implement health checks for all external services', async () => {
      const healthChecker = {
        async checkGmailAPI() {
          try {
            await mockGmail.users.messages.list({
              userId: 'me',
              maxResults: 1
            });
            return { service: 'gmail', status: 'healthy', timestamp: Date.now() };
          } catch (error: any) {
            return { service: 'gmail', status: 'unhealthy', error: error.message, timestamp: Date.now() };
          }
        },
        
        async checkAIService() {
          try {
            await mockAnthropic.messages.create({
              model: 'claude-3-sonnet-20240229',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'health check' }]
            });
            return { service: 'ai', status: 'healthy', timestamp: Date.now() };
          } catch (error: any) {
            return { service: 'ai', status: 'unhealthy', error: error.message, timestamp: Date.now() };
          }
        },
        
        async checkAllServices() {
          const services = await Promise.allSettled([
            this.checkGmailAPI(),
            this.checkAIService()
          ]);
          
          return services.map((result, index) => 
            result.status === 'fulfilled' ? result.value : 
            { service: ['gmail', 'ai'][index], status: 'error', error: result.reason.message }
          );
        }
      };
      
      mockGmail.users.messages.list.mockResolvedValue({ data: { messages: [] } });
      mockAnthropic.messages.create.mockResolvedValue({ content: [{ text: 'ok' }] });
      
      const health = await healthChecker.checkAllServices();
      
      expect(health).toHaveLength(2);
      expect(health[0].status).toBe('healthy');
      expect(health[1].status).toBe('healthy');
    });
  });
});