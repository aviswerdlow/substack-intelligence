import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist ALL mock functions to make them available in vi.mock
const { 
  mockJsonResponse, 
  mockServiceRoleClient, 
  mockCachedDbCheck,
  mockValidateEnvironment,
  mockGetEnvironmentHealth,
  mockGetHealthCacheHeaders
} = vi.hoisted(() => {
  const jsonResponse = vi.fn((data, options) => {
    // Create a Response-like object that includes data for testing
    return {
      json: async () => data,
      status: options?.status || 200,
      data: data, // For easier test access
      headers: new Headers(options?.headers || {}),
      ok: (options?.status || 200) < 400
    };
  });
  
  const serviceRoleClient = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({ data: [{ count: 1 }], error: null }))
    }))
  };

  const cachedDbCheck = vi.fn(async () => ({
    connected: true,
    error: null
  }));

  const validateEnvironment = vi.fn(() => ({
    isValid: true,
    isDegraded: false,
    missingRequired: [],
    missingOptional: [],
    invalid: [],
    status: []
  }));

  const getEnvironmentHealth = vi.fn(() => ({
    status: 'healthy',
    message: 'All required environment variables are configured correctly'
  }));

  const getHealthCacheHeaders = vi.fn((status) => ({ 'Cache-Control': 'no-store' }));
  
  return {
    mockJsonResponse: jsonResponse,
    mockServiceRoleClient: serviceRoleClient,
    mockCachedDbCheck: cachedDbCheck,
    mockValidateEnvironment: validateEnvironment,
    mockGetEnvironmentHealth: getEnvironmentHealth,
    mockGetHealthCacheHeaders: getHealthCacheHeaders
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
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
  createServiceRoleClientSafe: vi.fn(() => mockServiceRoleClient)
}));

// Mock env-validation module
vi.mock('../../apps/web/lib/env-validation', () => ({
  validateEnvironment: mockValidateEnvironment,
  getEnvironmentHealth: mockGetEnvironmentHealth
}));

// Mock health-cache module
vi.mock('../../apps/web/lib/health-cache', () => ({
  cachedDatabaseCheck: mockCachedDbCheck,
  getHealthCacheHeaders: mockGetHealthCacheHeaders
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
      NEXT_PUBLIC_NEXTAUTH_PUBLISHABLE_KEY: 'test-nextauth-pub-key',
      NEXTAUTH_SECRET_KEY: 'test-nextauth-secret',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      RESEND_API_KEY: 'test-resend-key'
    };

    // Mock successful database connection through cached check
    mockCachedDbCheck.mockResolvedValue({
      connected: true,
      error: null
    });
    
    // Mock healthy environment
    mockValidateEnvironment.mockReturnValue({
      isValid: true,
      isDegraded: false,
      missingRequired: [],
      missingOptional: [],
      invalid: [],
      status: []
    });
    
    mockGetEnvironmentHealth.mockReturnValue({
      status: 'healthy',
      message: 'All required environment variables are configured correctly'
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return healthy status when all systems are operational', async () => {
    const response = await healthHandler();
    
    // Parse the actual response since it's a real Response object
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toMatchObject({
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
        nextauth: true,
        gmail: true,
        resend: true
      }
    });
  });

  it('should return unhealthy status when required environment variables are missing', async () => {
    // Remove some required environment variables
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.NEXTAUTH_SECRET_KEY;
    
    // Mock environment validation showing missing vars
    mockValidateEnvironment.mockReturnValue({
      isValid: false,
      isDegraded: true,
      missingRequired: ['ANTHROPIC_API_KEY', 'NEXTAUTH_SECRET_KEY'],
      missingOptional: [],
      invalid: [],
      status: []
    });
    
    mockGetEnvironmentHealth.mockReturnValue({
      status: 'unhealthy',
      message: 'Critical environment variables are missing or invalid',
      issues: {
        missing: ['ANTHROPIC_API_KEY', 'NEXTAUTH_SECRET_KEY']
      }
    });

    const response = await healthHandler();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toMatchObject({
      status: 'unhealthy',
      timestamp: expect.any(String),
      database: {
        connected: true,
        latency: 'ok'
      },
      services: {
        supabase: true,
        anthropic: false,
        nextauth: false,
        gmail: true,
        resend: true
      },
      warnings: {
        missingRequired: expect.arrayContaining(['ANTHROPIC_API_KEY', 'NEXTAUTH_SECRET_KEY'])
      }
    });
  });

  it('should handle database connection errors gracefully', async () => {
    // Simulate database connection error (not missing config)
    mockCachedDbCheck.mockResolvedValue({
      connected: false,
      error: 'Connection failed'
    });

    const response = await healthHandler();
    const data = await response.json();

    // When database has an error but is configured, returns unhealthy status
    expect(response.status).toBe(503);
    expect(data).toMatchObject({
      status: 'unhealthy',
      timestamp: expect.any(String),
      database: {
        connected: false,
        latency: 'error',
        error: 'Connection failed'
      }
    });
  });

  it('should handle database client exceptions', async () => {
    // Simulate database throwing an error during query
    mockCachedDbCheck.mockResolvedValue({
      connected: false,
      error: 'Database unavailable'
    });

    const response = await healthHandler();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toMatchObject({
      status: 'unhealthy',
      timestamp: expect.any(String),
      database: {
        connected: false,
        latency: 'error',
        error: 'Database unavailable'
      }
    });
  });

  it('should handle non-Error exceptions gracefully', async () => {
    // Test handling of non-Error thrown values
    mockCachedDbCheck.mockRejectedValue('Unknown error type');

    const response = await healthHandler();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toMatchObject({
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
      'NEXT_PUBLIC_NEXTAUTH_PUBLISHABLE_KEY',
      'NEXTAUTH_SECRET_KEY'
    ];

    requiredEnvVars.forEach(envVar => {
      delete process.env[envVar];
    });

    // Mock validation showing all required missing
    mockValidateEnvironment.mockReturnValue({
      isValid: false,
      isDegraded: true,
      missingRequired: requiredEnvVars,
      missingOptional: [],
      invalid: [],
      status: []
    });
    
    mockGetEnvironmentHealth.mockReturnValue({
      status: 'unhealthy',
      message: 'Critical environment variables are missing or invalid',
      issues: {
        missing: requiredEnvVars
      }
    });

    const response = await healthHandler();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.warnings.missingRequired).toEqual(expect.arrayContaining(requiredEnvVars));
  });

  it('should include version information from package.json if available', async () => {
    process.env.npm_package_version = '2.1.0';

    const response = await healthHandler();
    const data = await response.json();

    expect(data.version).toBe('2.1.0');
  });

  it('should use default version when package version is not available', async () => {
    delete process.env.npm_package_version;

    const response = await healthHandler();
    const data = await response.json();

    expect(data.version).toBe('1.0.0');
  });

  it('should verify database check is performed', async () => {
    await healthHandler();

    // Verify that cached database check was called
    expect(mockCachedDbCheck).toHaveBeenCalled();
  });

  it('should log errors to console when health check fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Make the cached check throw an error
    mockCachedDbCheck.mockRejectedValue(new Error('Database connection failed'));

    await healthHandler();

    expect(consoleSpy).toHaveBeenCalledWith('Health check failed:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('should include current environment in response', async () => {
    process.env.NODE_ENV = 'production';

    const response = await healthHandler();
    const data = await response.json();

    expect(data.environment).toBe('production');
  });

  it('should check optional service configurations', async () => {
    // Remove optional services
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.RESEND_API_KEY;

    const response = await healthHandler();
    const data = await response.json();

    expect(data.services).toMatchObject({
      gmail: false,
      resend: false
    });
  });

  it('should return degraded status when database is not configured', async () => {
    // Simulate database not configured
    mockCachedDbCheck.mockResolvedValue({
      connected: false,
      error: 'Database client not configured'
    });

    // But environment is otherwise healthy
    mockGetEnvironmentHealth.mockReturnValue({
      status: 'degraded',
      message: 'Optional environment variables are missing'
    });

    const response = await healthHandler();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.database.connected).toBe(false);
  });

  it('should differentiate between configuration and runtime errors', async () => {
    // Test configuration error (degraded)
    mockCachedDbCheck.mockResolvedValue({
      connected: false,
      error: 'Database client not configured'
    });

    mockGetEnvironmentHealth.mockReturnValue({
      status: 'degraded',
      message: 'Database not configured'
    });

    let response = await healthHandler();
    let data = await response.json();
    expect(data.status).toBe('degraded');

    // Test runtime error (unhealthy)
    mockCachedDbCheck.mockResolvedValue({
      connected: false,
      error: 'Connection timeout'
    });

    response = await healthHandler();
    data = await response.json();
    expect(data.status).toBe('unhealthy');
  });
});