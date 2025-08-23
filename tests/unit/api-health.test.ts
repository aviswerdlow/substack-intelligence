import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import the actual route handler
import { GET as healthHandler } from '../../apps/web/app/api/health/route';

// Mock NextResponse.json to capture response data and status
const mockJsonResponse = vi.fn((data, options) => ({
  json: () => Promise.resolve(data),
  status: options?.status || 200,
  data,
  options
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server');
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: mockJsonResponse
    }
  };
});

// Create mock Supabase client for health checks
const mockServiceRoleClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    limit: vi.fn(() => Promise.resolve({ data: [{ count: 1 }], error: null }))
  }))
};

vi.mock('@substack-intelligence/database', () => ({
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient)
}));

// Mock environment variables
const originalEnv = process.env;

describe('API Health Route', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Set up healthy environment by default
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'test-clerk-pub-key',
      CLERK_SECRET_KEY: 'test-clerk-secret',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      RESEND_API_KEY: 'test-resend-key'
    };

    // Mock successful database connection
    mockServiceRoleClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({ data: [{ count: 1 }], error: null }))
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return healthy status when all systems are operational', async () => {
    const response = await healthHandler();

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      status: 'healthy',
      timestamp: expect.any(String),
      version: expect.any(String),
      environment: 'test',
      database: {
        connected: true,
        latency: 'ok'
      },
      services: {
        supabase: true,
        anthropic: true,
        clerk: true,
        gmail: true,
        resend: true
      }
    });
    expect(response.data).not.toHaveProperty('warnings');
  });

  it('should return degraded status when required environment variables are missing', async () => {
    // Remove some required environment variables
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLERK_SECRET_KEY;

    const response = await healthHandler();

    expect(response.status).toBe(503);
    expect(response.data).toMatchObject({
      status: 'degraded',
      timestamp: expect.any(String),
      database: {
        connected: true,
        latency: 'ok'
      },
      services: {
        supabase: true,
        anthropic: false,
        clerk: false,
        gmail: true,
        resend: true
      },
      warnings: {
        missingEnvVars: expect.arrayContaining(['ANTHROPIC_API_KEY', 'CLERK_SECRET_KEY'])
      }
    });
  });

  it('should handle database connection errors', async () => {
    mockServiceRoleClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Connection failed' } }))
    });

    const response = await healthHandler();

    expect(response.data).toMatchObject({
      database: {
        connected: false,
        latency: 'error'
      },
      services: {
        supabase: false
      }
    });
  });

  it('should return unhealthy status when database throws an error', async () => {
    mockServiceRoleClient.from.mockImplementation(() => {
      throw new Error('Database unavailable');
    });

    const response = await healthHandler();

    expect(response.status).toBe(503);
    expect(response.data).toMatchObject({
      status: 'unhealthy',
      timestamp: expect.any(String),
      error: 'Database unavailable'
    });
  });

  it('should handle unknown error types gracefully', async () => {
    mockServiceRoleClient.from.mockImplementation(() => {
      throw 'Unknown error type';
    });

    const response = await healthHandler();

    expect(response.status).toBe(503);
    expect(response.data).toMatchObject({
      status: 'unhealthy',
      timestamp: expect.any(String),
      error: 'Unknown error'
    });
  });

  it('should check all required environment variables', async () => {
    // Remove all required environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_KEY',
      'ANTHROPIC_API_KEY',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY'
    ];

    requiredEnvVars.forEach(envVar => {
      delete process.env[envVar];
    });

    const response = await healthHandler();

    expect(response.status).toBe(503);
    expect(response.data.status).toBe('degraded');
    expect(response.data.warnings.missingEnvVars).toEqual(expect.arrayContaining(requiredEnvVars));
  });

  it('should include version information from package.json if available', async () => {
    process.env.npm_package_version = '2.1.0';

    const response = await healthHandler();

    expect(response.data.version).toBe('2.1.0');
  });

  it('should use default version when package version is not available', async () => {
    delete process.env.npm_package_version;

    const response = await healthHandler();

    expect(response.data.version).toBe('1.0.0');
  });

  it('should verify database query is performed correctly', async () => {
    await healthHandler();

    expect(mockServiceRoleClient.from).toHaveBeenCalledWith('emails');
    expect(mockServiceRoleClient.from().select).toHaveBeenCalledWith('count(*)');
    expect(mockServiceRoleClient.from().limit).toHaveBeenCalledWith(1);
  });

  it('should log errors to console when health check fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockServiceRoleClient.from.mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    await healthHandler();

    expect(consoleSpy).toHaveBeenCalledWith('Health check failed:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('should include current environment in response', async () => {
    process.env.NODE_ENV = 'production';

    const response = await healthHandler();

    expect(response.data.environment).toBe('production');
  });

  it('should check optional service configurations', async () => {
    // Remove optional services
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.RESEND_API_KEY;

    const response = await healthHandler();

    expect(response.data.services).toMatchObject({
      gmail: false,
      resend: false
    });
  });
});