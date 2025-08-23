import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Import all centralized mock factories
import { supabaseMocks } from './mocks/database/supabase';
import { databaseMocks } from './mocks/database/queries';
import { nextjsMocks, headersMocks } from './mocks/nextjs/server';
import { clerkNextjsMocks, clerkMocks } from './mocks/auth/clerk';
import { anthropicMocks, openaiMocks, resendMocks, externalServicesMocks } from './mocks/external/services';
import { googleApisMocks, gmailMocks } from './mocks/external/gmail';
import { puppeteerModuleMocks, puppeteerMocks } from './mocks/external/puppeteer';
import { axiomLogger, axiomMocks } from './mocks/external/axiom';
import { burstProtection, rateLimitingMocks } from './mocks/external/rate-limiting';
import { databaseQueryMocks } from './mocks/database/queries';

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

// Mock @substack-intelligence/database with centralized mocks
vi.mock('@substack-intelligence/database', () => databaseMocks);

// Mock Axiom logger with centralized mock
vi.mock('../apps/web/lib/monitoring/axiom', () => ({ axiomLogger }));

// Mock rate limiting with centralized mock
vi.mock('../apps/web/lib/security/rate-limiting', () => ({ burstProtection }));

// Mock Clerk authentication with centralized mocks
vi.mock('@clerk/nextjs', () => clerkNextjsMocks);

// Mock Next.js server components with centralized mocks
vi.mock('next/server', () => nextjsMocks);
vi.mock('next/headers', () => headersMocks);

// Mock Supabase packages with centralized mocks
vi.mock('@supabase/supabase-js', () => supabaseMocks);
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: supabaseMocks.createClient,
  createServerClient: supabaseMocks.createClient
}));

// Mock Puppeteer with centralized mocks (v21.5.2 compatible)
vi.mock('puppeteer', () => puppeteerModuleMocks);

// Mock Resend email service with centralized mock
vi.mock('resend', () => resendMocks);

// Mock Anthropic SDK with centralized mock (v0.60.0 compatible)
vi.mock('@anthropic-ai/sdk', () => anthropicMocks);

// Mock OpenAI SDK with centralized mock (v4.20.1 compatible)
vi.mock('openai', () => openaiMocks);

// Mock Google APIs with centralized mock
vi.mock('googleapis', () => googleApisMocks);

// Mock additional dependencies
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

// Mock utility functions
vi.mock('@substack-intelligence/ingestion/utils/logging', () => ({
  axiomLogger: {
    logEmailEvent: vi.fn(),
    logError: vi.fn(),
    logDatabaseEvent: vi.fn(),
    logHealthCheck: vi.fn(),
    logBusinessMetric: vi.fn()
  }
}));

vi.mock('@substack-intelligence/ingestion/utils/validation', () => ({
  redactSensitiveData: vi.fn((data) => data)
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

// Set a consistent test date
const TEST_DATE = new Date('2024-01-15T10:00:00Z');
vi.setSystemTime(TEST_DATE);

// Clean up after each test - Reset all centralized mocks
afterEach(() => {
  vi.clearAllMocks();
  
  // Reset all centralized mock factories
  try {
    axiomMocks.resetAllMocks();
    rateLimitingMocks.resetAllMocks();
    clerkMocks.resetAllMocks();
    externalServicesMocks.resetAllMocks();
    gmailMocks.resetAllMocks();
    puppeteerMocks.resetAllMocks();
    databaseQueryMocks.resetAllMocks();
  } catch (error) {
    // Silently handle any errors during cleanup
  }
});

// Global test utilities available in all test files
declare global {
  namespace globalThis {
    var testUtils: {
      // Mock factory shortcuts for easy access in tests
      mockSuccessfulAuth: () => void;
      mockSignedInUser: (overrides?: any) => any;
      mockSignedOutUser: () => void;
      mockAnthropicSuccess: (response?: string) => void;
      mockAnthropicError: (error?: any) => void;
      mockOpenAIEmbeddingsSuccess: (embeddings?: number[][]) => void;
      mockResendSuccess: (emailId?: string) => void;
      mockPuppeteerPDFSuccess: () => void;
      mockAxiomLogging: () => void;
      mockGmailSuccess: () => void;
      resetAllTestMocks: () => void;
    };
  }
}

// Provide global test utilities for convenience
globalThis.testUtils = {
  mockSuccessfulAuth: () => {
    clerkMocks.mockSignedInUser();
  },
  
  mockSignedInUser: (overrides?: any) => {
    return clerkMocks.mockSignedInUser(overrides);
  },
  
  mockSignedOutUser: () => {
    clerkMocks.mockSignedOutUser();
  },
  
  mockAnthropicSuccess: (response?: string) => {
    externalServicesMocks.mockAnthropicSuccess(response);
  },
  
  mockAnthropicError: (error?: any) => {
    externalServicesMocks.mockAnthropicError(error);
  },
  
  mockOpenAIEmbeddingsSuccess: (embeddings?: number[][]) => {
    externalServicesMocks.mockOpenAIEmbeddingsSuccess(embeddings);
  },
  
  mockResendSuccess: (emailId?: string) => {
    externalServicesMocks.mockResendSuccess(emailId);
  },
  
  mockPuppeteerPDFSuccess: () => {
    puppeteerMocks.mockSuccessfulLaunch();
    puppeteerMocks.mockPDFGeneration();
  },
  
  mockAxiomLogging: () => {
    axiomMocks.mockSuccessfulLogging();
  },
  
  mockGmailSuccess: () => {
    gmailMocks.mockSuccessfulAuth();
    gmailMocks.mockMessagesListSuccess();
    gmailMocks.mockMessageGetSuccess();
  },
  
  resetAllTestMocks: () => {
    try {
      axiomMocks.resetAllMocks();
      rateLimitingMocks.resetAllMocks();
      clerkMocks.resetAllMocks();
      externalServicesMocks.resetAllMocks();
      gmailMocks.resetAllMocks();
      puppeteerMocks.resetAllMocks();
      databaseQueryMocks.resetAllMocks();
    } catch (error) {
      // Silently handle any import errors
    }
  }
};

