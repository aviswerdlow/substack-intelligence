import { vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Mock server-only module first to prevent import errors
vi.mock('server-only', () => ({}));

// Mock security session helper to avoid network calls during tests
vi.mock('@substack-intelligence/lib/security/session', async () => {
  const actual = await vi.importActual<typeof import('@substack-intelligence/lib/security/session')>(
    '@substack-intelligence/lib/security/session'
  );
  const { securitySessionController } = await import('./mocks/auth/security-session-controller');

  return {
    ...actual,
    getServerSecuritySession: vi.fn(async () => securitySessionController.getSession()),
    fetchUserAccessProfile: vi.fn(async (userId: string) => {
      const session = securitySessionController.getSession();
      const baseUser = session?.user ?? securitySessionController.getDefaultUser();
      return {
        id: userId,
        role: baseUser.role,
        permissions: baseUser.permissions,
        isVerified: baseUser.isVerified,
        organizationId: baseUser.organizationId
      };
    })
  };
});

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
vi.useFakeTimers();

// Set a consistent test date
const TEST_DATE = new Date('2024-01-15T10:00:00Z');
vi.setSystemTime(TEST_DATE);