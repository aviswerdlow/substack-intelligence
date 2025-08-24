import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock functions to make them available in vi.mock
const { mockJsonResponse, mockServiceRoleClient } = vi.hoisted(() => {
  const jsonResponse = vi.fn((data, options) => {
    // This mock should return an object that looks like what the tests expect
    // The tests expect response.status (HTTP status) and response.data (JSON data)
    const response = {
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      data: data, // This is the key - the data goes directly here
      options
    };
    return response;
  });
  
  const serviceRoleClient = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({ data: [{ count: 1 }], error: null }))
    }))
  };
  
  return {
    mockJsonResponse: jsonResponse,
    mockServiceRoleClient: serviceRoleClient
  };
});

// Mock next/server first
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

// Mock database client
vi.mock('@substack-intelligence/database', () => ({
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient)
}));

// Import the actual route handler AFTER mocks are set up
import { GET as healthHandler } from '../../apps/web/app/api/health/route';

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
    
    // Try to access properties that might exist
    if (response && typeof response.json === 'function') {
      const jsonData = await response.json();
      expect(jsonData).toMatchObject({
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
    } else {
      // If it's not a Response object, maybe it's the data directly
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
    }
  });

  it('should return degraded status when required environment variables are missing', async () => {
    // Remove some required environment variables
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLERK_SECRET_KEY;

    const response = await healthHandler();

    expect(response.status).toBe(503);
    
    // Try the same branching logic as the first test
    if (response && typeof response.json === 'function') {
      const jsonData = await response.json();
      expect(jsonData).toMatchObject({
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
    } else {
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
    }
  });

  it('should handle database connection errors', async () => {
    mockServiceRoleClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Connection failed' } }))
    });

    const response = await healthHandler();

    // When database has an error, it throws and returns unhealthy status
    expect(response.status).toBe(503);
    
    if (response && typeof response.json === 'function') {
      const jsonData = await response.json();
      expect(jsonData).toMatchObject({
        status: 'unhealthy',
        timestamp: expect.any(String),
        error: expect.any(String)
      });
    } else {
      expect(response.data).toMatchObject({
        status: 'unhealthy',
        timestamp: expect.any(String),
        error: expect.any(String)
      });
    }
  });

  it('should return unhealthy status when database throws an error', async () => {
    mockServiceRoleClient.from.mockImplementation(() => {
      throw new Error('Database unavailable');
    });

    const response = await healthHandler();

    expect(response.status).toBe(503);
    
    if (response && typeof response.json === 'function') {
      const jsonData = await response.json();
      expect(jsonData).toMatchObject({
        status: 'unhealthy',
        timestamp: expect.any(String),
        error: 'Database unavailable'
      });
    } else {
      expect(response.data).toMatchObject({
      status: 'unhealthy',
      timestamp: expect.any(String),
      error: 'Database unavailable'
    });
    }
  });

  it('should handle unknown error types gracefully', async () => {
    mockServiceRoleClient.from.mockImplementation(() => {
      throw 'Unknown error type';
    });

    const response = await healthHandler();

    expect(response.status).toBe(503);
    
    if (response && typeof response.json === 'function') {
      const jsonData = await response.json();
      expect(jsonData).toMatchObject({
        status: 'unhealthy',
        timestamp: expect.any(String),
        error: 'Unknown error'
      });
    } else {
      expect(response.data).toMatchObject({
      status: 'unhealthy',
      timestamp: expect.any(String),
      error: 'Unknown error'
    });
    }
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
    
    if (response && typeof response.json === 'function') {
      const jsonData = await response.json();
      expect(jsonData.status).toBe('degraded');
      expect(jsonData.warnings.missingEnvVars).toEqual(expect.arrayContaining(requiredEnvVars));
    } else {
      expect(response.data.status).toBe('degraded');
      expect(response.data.warnings.missingEnvVars).toEqual(expect.arrayContaining(requiredEnvVars));
    }
  });

  it('should include version information from package.json if available', async () => {
    process.env.npm_package_version = '2.1.0';

    const response = await healthHandler();

    if (response && typeof response.json === 'function') {
      const jsonData = await response.json();
      expect(jsonData.version).toBe('2.1.0');
    } else {
      expect(response.data.version).toBe('2.1.0');
    }
  });

  it('should use default version when package version is not available', async () => {
    delete process.env.npm_package_version;

    const response = await healthHandler();

    if (response && typeof response.json === 'function') {
      const jsonData = await response.json();
      expect(jsonData.version).toBe('1.0.0');
    } else {
      expect(response.data.version).toBe('1.0.0');
    }
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

    if (response && typeof response.json === 'function') {
      const jsonData = await response.json();
      expect(jsonData.environment).toBe('production');
    } else {
      expect(response.data.environment).toBe('production');
    }
  });

  it('should check optional service configurations', async () => {
    // Remove optional services
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.RESEND_API_KEY;

    const response = await healthHandler();

    if (response && typeof response.json === 'function') {
      const jsonData = await response.json();
      expect(jsonData.services).toMatchObject({
        gmail: false,
        resend: false
      });
    } else {
      expect(response.data.services).toMatchObject({
        gmail: false,
        resend: false
      });
    }
  });
});