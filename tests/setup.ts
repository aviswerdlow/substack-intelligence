import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REFRESH_TOKEN = 'test-refresh-token';
process.env.REPORT_RECIPIENTS = 'test@example.com';

// Mock console methods to reduce noise in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

console.error = vi.fn((message, ...args) => {
  // Still log actual test errors
  if (typeof message === 'string' && message.includes('Error:')) {
    originalConsoleError(message, ...args);
  }
});

console.warn = vi.fn();
console.log = vi.fn();

// Mock modules that cause resolution issues
vi.mock('@substack-intelligence/database', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
          data: [],
          error: null
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({ data: [], error: null }))
        })),
        single: vi.fn(() => ({ data: null, error: null })),
        data: [],
        error: null
      })),
      insert: vi.fn(() => ({ data: null, error: null })),
      update: vi.fn(() => ({ data: null, error: null })),
      upsert: vi.fn(() => ({ data: null, error: null })),
      delete: vi.fn(() => ({ data: null, error: null }))
    }))
  })),
  createClientComponentClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null }))
    }))
  })),
  createServerComponentClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null }))
    }))
  })),
  createRouteHandlerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null }))
    }))
  })),
  getCompanyById: vi.fn().mockResolvedValue(null),
  getCompanies: vi.fn().mockResolvedValue([]),
  getDailyIntelligence: vi.fn().mockResolvedValue([
    {
      company_id: 'test-company-id',
      name: 'Test Company',
      description: 'A test company',
      website: 'https://test.com',
      context: 'Test company news',
      sentiment: 'positive',
      confidence: 0.9,
      newsletter_name: 'Test Newsletter',
      received_at: '2024-01-15',
      funding_status: 'Series A'
    }
  ]),
  getEmailById: vi.fn().mockResolvedValue(null),
  getRecentEmails: vi.fn().mockResolvedValue([]),
  getTopNewsletters: vi.fn().mockResolvedValue([]),
  searchCompanies: vi.fn().mockResolvedValue([]),
  getAnalytics: vi.fn().mockResolvedValue({})
}));

// Mock axiomLogger module
vi.mock('../apps/web/lib/monitoring/axiom', () => ({
  axiomLogger: {
    log: vi.fn().mockResolvedValue(undefined),
    logError: vi.fn().mockResolvedValue(undefined),
    logAppEvent: vi.fn().mockResolvedValue(undefined),
    logEmailEvent: vi.fn().mockResolvedValue(undefined),
    logExtractionEvent: vi.fn().mockResolvedValue(undefined),
    logApiRequest: vi.fn().mockResolvedValue(undefined),
    logDatabaseEvent: vi.fn().mockResolvedValue(undefined),
    logSecurityEvent: vi.fn().mockResolvedValue(undefined),
    logReportEvent: vi.fn().mockResolvedValue(undefined),
    logPerformance: vi.fn().mockResolvedValue(undefined),
    logBusinessMetric: vi.fn().mockResolvedValue(undefined),
    logUserActivity: vi.fn().mockResolvedValue(undefined),
    logHealthCheck: vi.fn().mockResolvedValue(undefined),
    logBatch: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock Clerk authentication
vi.mock('@clerk/nextjs', () => ({
  currentUser: vi.fn(),
  auth: vi.fn(() => ({ userId: 'test-user-id' })),
  SignedIn: vi.fn(({ children }) => children),
  SignedOut: vi.fn(({ children }) => children),
  ClerkProvider: vi.fn(({ children }) => children)
}));

// Mock Next.js server components
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name) => ({ value: `test-${name}` })),
    set: vi.fn(),
    getAll: vi.fn(() => [])
  })),
  headers: vi.fn(() => new Map())
}));

// Mock Supabase packages (v2.38.4 compatible)
const createMockSupabaseQueryBuilder = () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    // Promise-like behavior for direct await
    then: vi.fn((resolve) => resolve({ data: [], error: null })),
    catch: vi.fn(),
    finally: vi.fn()
  };
  
  // Add data and error properties
  Object.defineProperty(queryBuilder, 'data', { value: [], writable: true });
  Object.defineProperty(queryBuilder, 'error', { value: null, writable: true });
  
  return queryBuilder;
};

const createMockSupabaseClient = () => ({
  from: vi.fn(() => createMockSupabaseQueryBuilder()),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: null, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null })
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  },
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis()
  }))
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(createMockSupabaseClient)
}));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(createMockSupabaseClient),
  createServerClient: vi.fn(createMockSupabaseClient)
}));

// Restore console methods after tests
afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Mock fetch for tests
global.fetch = vi.fn();

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    })
  }
});

// Mock setTimeout and Date for consistent testing
vi.mock('setTimeout');
vi.useFakeTimers();

// Mock puppeteer (v21.5.2 compatible)
vi.mock('puppeteer', () => {
  const mockPage = {
    setContent: vi.fn().mockResolvedValue(undefined),
    pdf: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
    close: vi.fn().mockResolvedValue(undefined),
    goto: vi.fn().mockResolvedValue(undefined),
    setViewport: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined)
  };
  
  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
    pages: vi.fn().mockResolvedValue([mockPage])
  };
  
  return {
    default: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
      executablePath: vi.fn().mockReturnValue('/usr/bin/chromium'),
      connect: vi.fn().mockResolvedValue(mockBrowser)
    },
    launch: vi.fn().mockResolvedValue(mockBrowser),
    executablePath: vi.fn().mockReturnValue('/usr/bin/chromium'),
    connect: vi.fn().mockResolvedValue(mockBrowser)
  };
});

// Mock Resend email service with comprehensive mock
vi.mock('resend', () => {
  const mockResendInstance = {
    emails: {
      send: vi.fn().mockResolvedValue({ 
        data: { 
          id: 'email-123',
          from: 'test@example.com',
          to: ['recipient@example.com'],
          created_at: new Date().toISOString()
        },
        error: null
      }),
      get: vi.fn().mockResolvedValue({
        data: {
          id: 'email-123',
          status: 'delivered'
        }
      })
    },
    domains: {
      list: vi.fn().mockResolvedValue({ data: [] })
    },
    apiKeys: {
      list: vi.fn().mockResolvedValue({ data: [] })
    }
  };
  
  return {
    Resend: vi.fn(() => mockResendInstance),
    default: vi.fn(() => mockResendInstance)
  };
});

// Mock Anthropic SDK (v0.60.0 compatible)
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(() => Promise.resolve({
        id: 'msg_test_id',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-5-sonnet-20241022',
        content: [{
          type: 'text',
          text: JSON.stringify({
            companies: [],
            metadata: {
              processingTime: 1000,
              tokenCount: 100,
              modelVersion: 'claude-3-5-sonnet-20241022'
            }
          })
        }],
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      }))
    }
  })),
  Anthropic: vi.fn(() => ({
    messages: {
      create: vi.fn(() => Promise.resolve({
        id: 'msg_test_id',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-5-sonnet-20241022',
        content: [{
          type: 'text',
          text: JSON.stringify({
            companies: [],
            metadata: {
              processingTime: 1000,
              tokenCount: 100,
              modelVersion: 'claude-3-5-sonnet-20241022'
            }
          })
        }],
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      }))
    }
  }))
}));

// Mock OpenAI SDK (v4.20.1 compatible)
vi.mock('openai', () => ({
  default: vi.fn(() => ({
    embeddings: {
      create: vi.fn(() => Promise.resolve({
        object: 'list',
        data: [{
          object: 'embedding',
          embedding: new Array(1536).fill(0).map(() => Math.random() - 0.5),
          index: 0
        }],
        model: 'text-embedding-3-small',
        usage: {
          prompt_tokens: 10,
          total_tokens: 10
        }
      }))
    },
    chat: {
      completions: {
        create: vi.fn(() => Promise.resolve({
          id: 'chatcmpl-test',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4-turbo-preview',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'Test response'
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15
          }
        }))
      }
    }
  })),
  OpenAI: vi.fn(() => ({
    embeddings: {
      create: vi.fn(() => Promise.resolve({
        object: 'list',
        data: [{
          object: 'embedding',
          embedding: new Array(1536).fill(0).map(() => Math.random() - 0.5),
          index: 0
        }],
        model: 'text-embedding-3-small',
        usage: {
          prompt_tokens: 10,
          total_tokens: 10
        }
      }))
    },
    chat: {
      completions: {
        create: vi.fn(() => Promise.resolve({
          id: 'chatcmpl-test',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4-turbo-preview',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'Test response'
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15
          }
        }))
      }
    }
  }))
}));

// Set a consistent test date
const TEST_DATE = new Date('2024-01-15T10:00:00Z');
vi.setSystemTime(TEST_DATE);

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});