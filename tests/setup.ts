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
  getCompanyById: vi.fn(),
  getCompanies: vi.fn(),
  getDailyIntelligence: vi.fn(),
  getEmailById: vi.fn(),
  getRecentEmails: vi.fn(),
  getTopNewsletters: vi.fn(),
  searchCompanies: vi.fn(),
  getAnalytics: vi.fn()
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

// Mock Supabase packages
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null }))
    }))
  }))
}));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null }))
    }))
  })),
  createServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null }))
    }))
  }))
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

// Mock puppeteer
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(() => Promise.resolve({
      newPage: vi.fn(() => Promise.resolve({
        setContent: vi.fn(),
        pdf: vi.fn(() => Promise.resolve(Buffer.from('mock-pdf'))),
        close: vi.fn()
      })),
      close: vi.fn()
    }))
  }
}));

// Mock Resend email service
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn(() => Promise.resolve({ data: { id: 'email-123' } }))
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