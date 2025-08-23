import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REFRESH_TOKEN = 'test-refresh-token';

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
    randomUUID: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000')
  }
});

// Mock setTimeout and Date for consistent testing
vi.mock('setTimeout');
vi.useFakeTimers();

// Set a consistent test date
const TEST_DATE = new Date('2024-01-15T10:00:00Z');
vi.setSystemTime(TEST_DATE);