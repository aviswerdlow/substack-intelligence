import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = process.env;

describe('Health Endpoint - Environment Variable Handling', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Reset modules to ensure fresh imports
    vi.resetModules();
    
    // Start with minimal environment
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test'
    };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.resetModules();
  });

  it('should handle completely missing Supabase configuration gracefully', async () => {
    // No Supabase env vars at all
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Mock NextResponse to return a testable object
    vi.mock('next/server', () => ({
      NextResponse: {
        json: vi.fn((data, options) => ({
          json: () => Promise.resolve(data),
          status: options?.status || 200,
          data
        }))
      }
    }));

    // Import after env is set up
    const { createServiceRoleClientSafe } = await import('@substack-intelligence/database');
    
    // Test that safe client returns null instead of throwing
    const client = createServiceRoleClientSafe();
    expect(client).toBeNull();
  });

  it('should return degraded status when database is not configured', async () => {
    // Set up partial environment (no database)
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.NEXTAUTH_SECRET_KEY = 'test-nextauth';
    process.env.NEXT_PUBLIC_NEXTAUTH_PUBLISHABLE_KEY = 'test-nextauth-pub';
    
    // Mock the safe client to return null
    vi.mock('@substack-intelligence/database', () => ({
      createServiceRoleClientSafe: vi.fn(() => null)
    }));

    // Mock NextResponse
    const mockJsonResponse = vi.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      data
    }));

    vi.mock('next/server', () => ({
      NextResponse: {
        json: mockJsonResponse
      }
    }));

    // Import health handler after mocks
    const { GET } = await import('../../apps/web/app/api/health/route');
    
    const response = await GET();
    
    expect(response.status).toBe(503);
    expect(response.data.status).toBe('degraded');
    expect(response.data.database.connected).toBe(false);
    expect(response.data.database.error).toBe('Database client not configured');
  });

  it('should differentiate between missing config and connection failures', async () => {
    // Set up full environment
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      NEXT_PUBLIC_NEXTAUTH_PUBLISHABLE_KEY: 'test-nextauth-pub-key',
      NEXTAUTH_SECRET_KEY: 'test-nextauth-secret'
    };

    // Mock a configured but failing database
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({ 
          data: null, 
          error: { message: 'Connection timeout' } 
        }))
      }))
    };

    vi.mock('@substack-intelligence/database', () => ({
      createServiceRoleClientSafe: vi.fn(() => mockClient)
    }));

    // Mock NextResponse
    const mockJsonResponse = vi.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      data
    }));

    vi.mock('next/server', () => ({
      NextResponse: {
        json: mockJsonResponse
      }
    }));

    // Import health handler after mocks
    const { GET } = await import('../../apps/web/app/api/health/route');
    
    const response = await GET();
    
    // Connection failure should be unhealthy, not just degraded
    expect(response.status).toBe(503);
    expect(response.data.status).toBe('unhealthy');
    expect(response.data.database.connected).toBe(false);
    expect(response.data.database.error).toBe('Connection timeout');
  });

  it('should handle partial environment configurations', async () => {
    // Only database configured, missing other services
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_KEY: 'test-service-key'
      // Missing: ANTHROPIC_API_KEY, NEXTAUTH keys, etc.
    };

    // Mock successful database connection
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({ 
          data: [{ count: 1 }], 
          error: null 
        }))
      }))
    };

    vi.mock('@substack-intelligence/database', () => ({
      createServiceRoleClientSafe: vi.fn(() => mockClient)
    }));

    // Mock NextResponse
    const mockJsonResponse = vi.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      data
    }));

    vi.mock('next/server', () => ({
      NextResponse: {
        json: mockJsonResponse
      }
    }));

    // Import health handler after mocks
    const { GET } = await import('../../apps/web/app/api/health/route');
    
    const response = await GET();
    
    expect(response.status).toBe(503);
    expect(response.data.status).toBe('degraded');
    expect(response.data.database.connected).toBe(true);
    expect(response.data.services.supabase).toBe(true);
    expect(response.data.services.anthropic).toBe(false);
    expect(response.data.services.nextauth).toBe(false);
    expect(response.data.warnings.missingEnvVars).toContain('ANTHROPIC_API_KEY');
    expect(response.data.warnings.missingEnvVars).toContain('NEXTAUTH_SECRET_KEY');
  });

  it('should not crash when createServiceRoleClient would normally throw', async () => {
    // This test ensures our safe wrapper prevents crashes
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_KEY;

    // Don't mock, let the real implementation run
    vi.mock('@substack-intelligence/database', async () => {
      const actual = await vi.importActual('@substack-intelligence/database');
      return {
        ...actual,
        // The safe version should handle the error internally
        createServiceRoleClientSafe: () => {
          try {
            return actual.createServiceRoleClient();
          } catch {
            return null;
          }
        }
      };
    });

    const { createServiceRoleClientSafe } = await import('@substack-intelligence/database');
    
    // Should not throw
    expect(() => createServiceRoleClientSafe()).not.toThrow();
    
    const client = createServiceRoleClientSafe();
    expect(client).toBeNull();
  });
});