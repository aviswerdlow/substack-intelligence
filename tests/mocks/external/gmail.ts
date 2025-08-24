import { vi } from 'vitest';

// Gmail API Types
export interface MockGmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      data?: string;
    };
    parts?: Array<{
      mimeType: string;
      body: {
        data?: string;
      };
    }>;
  };
  sizeEstimate: number;
  historyId: string;
  internalDate: string;
}

export interface MockGmailMessageList {
  messages: Array<{
    id: string;
    threadId: string;
  }>;
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface MockGmailProfile {
  emailAddress: string;
  messagesTotal: number;
  messagesUnread: number;
  threadsTotal: number;
  threadsUnread: number;
  historyId: string;
}

export interface MockOAuth2Credentials {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

// Gmail mock configuration
interface GmailMockConfig {
  oauth2: {
    shouldResolve: boolean;
    credentials?: MockOAuth2Credentials;
    rejectValue?: any;
  };
  messages: {
    list: {
      shouldResolve: boolean;
      resolveValue?: MockGmailMessageList;
      rejectValue?: any;
      delay?: number;
    };
    get: {
      shouldResolve: boolean;
      resolveValue?: MockGmailMessage;
      rejectValue?: any;
      delay?: number;
    };
  };
  users: {
    getProfile: {
      shouldResolve: boolean;
      resolveValue?: MockGmailProfile;
      rejectValue?: any;
    };
  };
}

class GmailMocks {
  private _config: GmailMockConfig = {
    oauth2: {
      shouldResolve: true,
      credentials: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        token_type: 'Bearer',
        expiry_date: Date.now() + 3600000 // 1 hour from now
      }
    },
    messages: {
      list: {
        shouldResolve: true,
        delay: 0
      },
      get: {
        shouldResolve: true,
        delay: 0
      }
    },
    users: {
      getProfile: {
        shouldResolve: true
      }
    }
  };

  // Configuration methods
  configureOAuth2(config: Partial<GmailMockConfig['oauth2']>): void {
    this._config.oauth2 = { ...this._config.oauth2, ...config };
  }

  configureMessagesList(config: Partial<GmailMockConfig['messages']['list']>): void {
    this._config.messages.list = { ...this._config.messages.list, ...config };
  }

  configureMessagesGet(config: Partial<GmailMockConfig['messages']['get']>): void {
    this._config.messages.get = { ...this._config.messages.get, ...config };
  }

  configureUsersGetProfile(config: Partial<GmailMockConfig['users']['getProfile']>): void {
    this._config.users.getProfile = { ...this._config.users.getProfile, ...config };
  }

  reset(): void {
    this._config = {
      oauth2: {
        shouldResolve: true,
        credentials: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          scope: 'https://www.googleapis.com/auth/gmail.readonly',
          token_type: 'Bearer',
          expiry_date: Date.now() + 3600000
        }
      },
      messages: {
        list: { shouldResolve: true, delay: 0 },
        get: { shouldResolve: true, delay: 0 }
      },
      users: {
        getProfile: { shouldResolve: true }
      }
    };
  }

  // Helper method to execute with config
  private async executeWithConfig<T>(
    configPath: string,
    defaultValue: T
  ): Promise<T> {
    const config = configPath.split('.').reduce((obj: any, key: string) => obj?.[key], this._config);

    if (config?.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config?.shouldResolve === false) {
      throw config.rejectValue || new Error(`Mock error for Gmail ${configPath}`);
    }

    return config?.resolveValue !== undefined ? config.resolveValue : defaultValue;
  }

  // OAuth2 Mocks
  setCredentials = vi.fn((credentials: MockOAuth2Credentials) => {
    this._config.oauth2.credentials = credentials;
  });

  getCredentials = vi.fn(() => {
    if (!this._config.oauth2.shouldResolve) {
      throw this._config.oauth2.rejectValue || new Error('OAuth2 error');
    }
    return this._config.oauth2.credentials;
  });

  // Gmail API Mocks
  listMessages = vi.fn(async (params: {
    userId: string;
    q?: string;
    maxResults?: number;
    pageToken?: string;
    labelIds?: string[];
  }): Promise<{ data: MockGmailMessageList }> => {
    const data = await this.executeWithConfig('messages.list', {
      messages: [],
      resultSizeEstimate: 0
    });

    return { data };
  });

  getMessage = vi.fn(async (params: {
    userId: string;
    id: string;
    format?: string;
  }): Promise<{ data: MockGmailMessage }> => {
    const data = await this.executeWithConfig('messages.get', {
      id: params.id,
      threadId: `thread-${params.id}`,
      snippet: 'Mock email snippet',
      payload: {
        headers: [
          { name: 'From', value: 'test@substack.com' },
          { name: 'Subject', value: 'Test Newsletter' },
          { name: 'Date', value: new Date().toISOString() }
        ],
        body: {
          data: Buffer.from('Mock email body content').toString('base64')
        }
      },
      sizeEstimate: 1024,
      historyId: '12345',
      internalDate: Date.now().toString()
    });

    return { data };
  });

  getProfile = vi.fn(async (params: {
    userId: string;
  }): Promise<{ data: MockGmailProfile }> => {
    const data = await this.executeWithConfig('users.getProfile', {
      emailAddress: 'test@example.com',
      messagesTotal: 100,
      messagesUnread: 5,
      threadsTotal: 50,
      threadsUnread: 3,
      historyId: '12345'
    });

    return { data };
  });

  // Utility methods for test scenarios
  mockSuccessfulAuth(credentials?: Partial<MockOAuth2Credentials>): void {
    this.configureOAuth2({
      shouldResolve: true,
      credentials: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        token_type: 'Bearer',
        expiry_date: Date.now() + 3600000,
        ...credentials
      }
    });
  }

  mockAuthError(error?: any): void {
    this.configureOAuth2({
      shouldResolve: false,
      rejectValue: error || new Error('OAuth2 authentication failed')
    });
  }

  mockMessagesListSuccess(messages?: Partial<MockGmailMessageList>): void {
    this.configureMessagesList({
      shouldResolve: true,
      resolveValue: {
        messages: [
          { id: 'msg-1', threadId: 'thread-1' },
          { id: 'msg-2', threadId: 'thread-2' }
        ],
        resultSizeEstimate: 2,
        ...messages
      }
    });
  }

  mockMessagesListError(error?: any): void {
    this.configureMessagesList({
      shouldResolve: false,
      rejectValue: error || new Error('Failed to list messages')
    });
  }

  mockMessageGetSuccess(message?: Partial<MockGmailMessage>): void {
    this.configureMessagesGet({
      shouldResolve: true,
      resolveValue: {
        id: 'mock-message-id',
        threadId: 'mock-thread-id',
        snippet: 'This is a mock email from a Substack newsletter...',
        payload: {
          headers: [
            { name: 'From', value: 'newsletter@substack.com' },
            { name: 'Subject', value: 'Weekly Newsletter - Tech Trends' },
            { name: 'Date', value: new Date().toISOString() },
            { name: 'Message-ID', value: '<mock-message-id@substack.com>' }
          ],
          body: {
            data: Buffer.from(`
              <html>
                <body>
                  <h1>Weekly Newsletter</h1>
                  <p>This week we're featuring several exciting companies:</p>
                  <ul>
                    <li>Glossier - The beauty brand that's revolutionizing makeup</li>
                    <li>Warby Parker - Disrupting the eyewear industry</li>
                    <li>Casper - Making sleep better for everyone</li>
                  </ul>
                </body>
              </html>
            `).toString('base64')
          }
        },
        sizeEstimate: 2048,
        historyId: '67890',
        internalDate: Date.now().toString(),
        ...message
      }
    });
  }

  mockMessageGetError(error?: any): void {
    this.configureMessagesGet({
      shouldResolve: false,
      rejectValue: error || new Error('Failed to get message')
    });
  }

  mockProfileSuccess(profile?: Partial<MockGmailProfile>): void {
    this.configureUsersGetProfile({
      shouldResolve: true,
      resolveValue: {
        emailAddress: 'user@example.com',
        messagesTotal: 1500,
        messagesUnread: 25,
        threadsTotal: 800,
        threadsUnread: 15,
        historyId: '98765',
        ...profile
      }
    });
  }

  mockProfileError(error?: any): void {
    this.configureUsersGetProfile({
      shouldResolve: false,
      rejectValue: error || new Error('Failed to get profile')
    });
  }

  // Create test data factories
  createTestMessage(overrides?: Partial<MockGmailMessage>): MockGmailMessage {
    return {
      id: 'test-msg-id',
      threadId: 'test-thread-id',
      snippet: 'Test newsletter content with company mentions...',
      payload: {
        headers: [
          { name: 'From', value: 'test@substack.com' },
          { name: 'Subject', value: 'Test Newsletter' },
          { name: 'Date', value: new Date().toISOString() }
        ],
        body: {
          data: Buffer.from('Test email body').toString('base64')
        }
      },
      sizeEstimate: 1024,
      historyId: 'test-history-id',
      internalDate: Date.now().toString(),
      ...overrides
    };
  }

  createTestMessageList(messageCount: number = 2): MockGmailMessageList {
    return {
      messages: Array.from({ length: messageCount }, (_, i) => ({
        id: `test-msg-${i + 1}`,
        threadId: `test-thread-${i + 1}`
      })),
      resultSizeEstimate: messageCount
    };
  }

  // Reset all mocks
  resetAllMocks(): void {
    Object.getOwnPropertyNames(this)
      .filter(name => typeof (this as any)[name]?.mockReset === 'function')
      .forEach(name => (this as any)[name].mockReset());
    
    this.reset();
  }
}

// Export singleton instance
export const gmailMocks = new GmailMocks();

// Export individual mocks for direct use
export const {
  setCredentials,
  getCredentials,
  listMessages,
  getMessage,
  getProfile
} = gmailMocks;

// Mock implementations for vi.mock('googleapis')
export const googleApisMocks = {
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials,
        getCredentials
      }))
    },
    gmail: vi.fn(() => ({
      users: {
        messages: {
          list: listMessages,
          get: getMessage
        },
        getProfile: getProfile
      }
    }))
  }
};

// Pre-configured test scenarios
export const gmailTestScenarios = {
  successfulAuth: () => gmailMocks.mockSuccessfulAuth(),
  authError: () => gmailMocks.mockAuthError(),
  
  emptyInbox: () => gmailMocks.mockMessagesListSuccess({ messages: [], resultSizeEstimate: 0 }),
  
  substackEmails: () => {
    gmailMocks.mockMessagesListSuccess({
      messages: [
        { id: 'substack-1', threadId: 'thread-1' },
        { id: 'substack-2', threadId: 'thread-2' }
      ],
      resultSizeEstimate: 2
    });
    
    gmailMocks.mockMessageGetSuccess({
      payload: {
        headers: [
          { name: 'From', value: 'newsletter@substack.com' },
          { name: 'Subject', value: 'The Future of Consumer Brands' }
        ],
        body: {
          data: Buffer.from(`
            <p>This week's standout companies include:</p>
            <p><strong>Glossier</strong> continues to dominate the beauty space...</p>
            <p><strong>Allbirds</strong> is making sustainable shoes mainstream...</p>
          `).toString('base64')
        }
      }
    });
  },
  
  // Pipeline-specific test scenarios
  freshPipelineData: () => {
    gmailMocks.mockSuccessfulAuth();
    gmailMocks.mockProfileSuccess({
      emailAddress: 'test@gmail.com',
      messagesTotal: 150,
      messagesUnread: 5
    });
    gmailMocks.mockMessagesListSuccess({
      messages: [
        { id: 'recent-1', threadId: 'thread-1' },
        { id: 'recent-2', threadId: 'thread-2' },
        { id: 'recent-3', threadId: 'thread-3' }
      ],
      resultSizeEstimate: 3
    });
  },
  
  stalePipelineData: () => {
    gmailMocks.mockSuccessfulAuth();
    gmailMocks.mockProfileSuccess({
      emailAddress: 'test@gmail.com',
      messagesTotal: 50,
      messagesUnread: 1
    });
    gmailMocks.mockMessagesListSuccess({
      messages: [{ id: 'old-1', threadId: 'thread-1' }],
      resultSizeEstimate: 1
    });
  },
  
  gmailApiQuotaExceeded: () => {
    gmailMocks.mockAuthError(new Error('Quota exceeded. Please try again later.'));
    gmailMocks.mockMessagesListError(new Error('Quota exceeded. Please try again later.'));
  },
  
  invalidRefreshToken: () => {
    gmailMocks.mockAuthError(new Error('Invalid refresh token. Please re-authenticate.'));
  },
  
  networkError: () => {
    gmailMocks.mockMessagesListError(new Error('Network timeout'));
    gmailMocks.mockProfileError(new Error('Network timeout'));
  },
  
  largeBatch: (messageCount: number = 100) => {
    gmailMocks.mockSuccessfulAuth();
    gmailMocks.mockMessagesListSuccess({
      messages: Array.from({ length: messageCount }, (_, i) => ({
        id: `bulk-msg-${i + 1}`,
        threadId: `bulk-thread-${i + 1}`
      })),
      resultSizeEstimate: messageCount
    });
    
    // Mock successful message get for bulk processing
    gmailMocks.mockMessageGetSuccess({
      payload: {
        headers: [
          { name: 'From', value: 'bulk@substack.com' },
          { name: 'Subject', value: 'Bulk Newsletter Content' }
        ],
        body: {
          data: Buffer.from(`
            <html>
              <body>
                <h1>Tech Newsletter</h1>
                <p>Featured companies this week:</p>
                <p><strong>Stripe</strong> - Payment processing platform</p>
                <p><strong>Notion</strong> - All-in-one workspace</p>
                <p><strong>Figma</strong> - Collaborative design tool</p>
              </body>
            </html>
          `).toString('base64')
        }
      }
    });
  }
};

// Pipeline test utilities
export const pipelineTestUtils = {
  // Configure Gmail mocks for successful pipeline run
  setupSuccessfulPipeline: () => {
    gmailTestScenarios.successfulAuth();
    gmailTestScenarios.substackEmails();
    gmailMocks.mockProfileSuccess({
      emailAddress: 'pipeline@test.com',
      messagesTotal: 100
    });
  },
  
  // Configure Gmail mocks for failed pipeline run
  setupFailedPipeline: (errorType: 'auth' | 'quota' | 'network' = 'auth') => {
    switch (errorType) {
      case 'auth':
        gmailTestScenarios.invalidRefreshToken();
        break;
      case 'quota':
        gmailTestScenarios.gmailApiQuotaExceeded();
        break;
      case 'network':
        gmailTestScenarios.networkError();
        break;
    }
  },
  
  // Configure mocks for configuration testing
  setupConfigurationTest: (missingVars: string[] = []) => {
    if (missingVars.includes('GOOGLE_CLIENT_ID') || missingVars.includes('GOOGLE_CLIENT_SECRET')) {
      gmailMocks.mockAuthError(new Error('OAuth2 configuration incomplete'));
    } else {
      gmailMocks.mockSuccessfulAuth();
    }
  },
  
  // Reset all mocks to clean state
  resetForTest: () => {
    gmailMocks.resetAllMocks();
  }
};