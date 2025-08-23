import { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client for rate limiting with fallback
let redis: Redis | null = null;
let rateLimitingEnabled = false;

try {
  // Only initialize Redis if environment variables are properly configured
  if (process.env.UPSTASH_REDIS_REST_URL && 
      process.env.UPSTASH_REDIS_REST_TOKEN &&
      !process.env.UPSTASH_REDIS_REST_URL.includes('your-redis')) {
    redis = Redis.fromEnv();
    rateLimitingEnabled = true;
    console.log('Rate limiting enabled with Redis');
  } else {
    console.log('Rate limiting disabled - Redis not configured');
  }
} catch (error) {
  console.warn('Failed to initialize Redis for rate limiting:', error);
  rateLimitingEnabled = false;
}

// Production-optimized rate limit configurations
const getProductionLimits = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const multiplier = isProduction ? 0.7 : 1; // Stricter limits in production
  
  return {
    // Authentication endpoints (stricter in production)
    'auth/signin': { requests: Math.floor(5 * multiplier), window: '1m' },
    'auth/signup': { requests: Math.floor(3 * multiplier), window: '5m' },
    
    // API endpoints
    'api/companies': { requests: Math.floor(100 * multiplier), window: '1h' },
    'api/emails/extract': { requests: Math.floor(10 * multiplier), window: '1m' },
    'api/reports/generate': { requests: Math.floor(5 * multiplier), window: '1h' },
    
    // AI endpoints (more restrictive due to cost)
    'api/test/anthropic': { requests: Math.floor(5 * multiplier), window: '1h' },
    'api/test/extract': { requests: Math.floor(10 * multiplier), window: '1h' },
    
    // High-cost operations
    'api/test/extract-all': { requests: Math.floor(2 * multiplier), window: '1h' },
    'api/test/extract-batch': { requests: Math.floor(3 * multiplier), window: '1h' },
    
    // Monitoring endpoints
    'api/monitoring/error': { requests: Math.floor(50 * multiplier), window: '1m' },
    'api/monitoring/performance': { requests: Math.floor(100 * multiplier), window: '1m' },
    
    // Health and system endpoints (less restrictive)
    'api/health': { requests: 500, window: '1m' },
    'api/config/validate': { requests: Math.floor(20 * multiplier), window: '1h' },
    
    // Generic API rate limit
    'api/*': { requests: Math.floor(200 * multiplier), window: '1h' },
    
    // Global rate limit per IP (stricter in production)
    'global': { requests: Math.floor(1000 * multiplier), window: '1h' }
  } as const;
};

export const RATE_LIMITS = getProductionLimits();

// Create rate limiters
const rateLimiters = new Map<string, Ratelimit>();

function getRateLimiter(endpoint: string): Ratelimit | null {
  // Return null if rate limiting is disabled
  if (!rateLimitingEnabled || !redis) {
    return null;
  }

  if (rateLimiters.has(endpoint)) {
    return rateLimiters.get(endpoint)!;
  }

  const config = RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS] || RATE_LIMITS['api/*'];
  
  const ratelimit = new Ratelimit({
    redis: redis as Redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    analytics: true,
    prefix: `ratelimit:${endpoint}`
  });

  rateLimiters.set(endpoint, ratelimit);
  return ratelimit;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: Date;
  limit: number;
}

export async function checkRateLimit(
  request: NextRequest,
  endpoint?: string
): Promise<RateLimitResult> {
  // If rate limiting is disabled, always return success
  if (!rateLimitingEnabled || process.env.DISABLE_SECURITY_MIDDLEWARE === 'true') {
    return {
      success: true,
      remaining: 999,
      reset: new Date(Date.now() + 3600000),
      limit: 1000
    };
  }

  // Get client identifier (prefer authenticated user, fallback to IP)
  const identifier = getClientIdentifier(request);
  
  // Determine endpoint for rate limiting
  const rateLimitEndpoint = endpoint || extractEndpoint(request);
  
  try {
    const ratelimit = getRateLimiter(rateLimitEndpoint);
    
    // If no rate limiter available, allow the request
    if (!ratelimit) {
      return {
        success: true,
        remaining: 999,
        reset: new Date(Date.now() + 3600000),
        limit: 1000
      };
    }
    
    const result = await ratelimit.limit(identifier);
    
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: result.limit
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if rate limiting service is down
    return {
      success: true,
      remaining: 0,
      reset: new Date(Date.now() + 60000),
      limit: 0
    };
  }
}

export function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from auth headers first
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback to IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  return `ip:${ip}`;
}

export function extractEndpoint(request: NextRequest): string {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Match specific endpoints
  for (const [endpoint] of Object.entries(RATE_LIMITS)) {
    if (endpoint.includes('*')) {
      const pattern = endpoint.replace('*', '.*');
      if (new RegExp(pattern).test(pathname)) {
        return endpoint;
      }
    } else if (pathname.includes(endpoint)) {
      return endpoint;
    }
  }

  // Default to generic API rate limit for API routes
  if (pathname.startsWith('/api/')) {
    return 'api/*';
  }

  return 'global';
}

// Rate limiting middleware
export async function withRateLimit(
  request: NextRequest,
  endpoint?: string
): Promise<Response | null> {
  const result = await checkRateLimit(request, endpoint);
  
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((result.reset.getTime() - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toISOString(),
          'Retry-After': Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString()
        }
      }
    );
  }

  return null; // Continue with request
}

// Burst protection for expensive operations
export class BurstProtection {
  private static instance: BurstProtection;
  private burstLimits = new Map<string, Ratelimit>();

  static getInstance(): BurstProtection {
    if (!BurstProtection.instance) {
      BurstProtection.instance = new BurstProtection();
    }
    return BurstProtection.instance;
  }

  async checkBurstLimit(
    identifier: string,
    operation: string,
    limit: number = 3,
    window: string = '1m'
  ): Promise<boolean> {
    const key = `${operation}:${identifier}`;
    
    if (!this.burstLimits.has(key)) {
      this.burstLimits.set(key, new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(limit, window),
        prefix: `burst:${key}`
      }));
    }

    const ratelimit = this.burstLimits.get(key)!;
    const result = await ratelimit.limit(identifier);
    
    return result.success;
  }
}

export const burstProtection = BurstProtection.getInstance();

// IP-based security measures
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

export const BLOCKED_IPS = new Set([
  // Add known malicious IPs here
  // This would typically be populated from threat intelligence feeds
]);

export const ALLOWED_COUNTRIES = new Set([
  'US', 'CA', 'GB', 'DE', 'FR', 'AU', 'NL', 'SE', 'NO', 'DK'
  // Add other allowed country codes
]);

export function isIPBlocked(ip: string): boolean {
  return BLOCKED_IPS.has(ip);
}

// Adaptive rate limiting based on user behavior
export class AdaptiveRateLimiting {
  private static suspiciousActivity = new Map<string, number>();
  
  static async adjustLimits(identifier: string, endpoint: string): Promise<number> {
    const baseConfig = RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS] || RATE_LIMITS['api/*'];
    const baseLimit = baseConfig.requests;
    
    const suspiciousScore = this.suspiciousActivity.get(identifier) || 0;
    
    // Reduce limits for suspicious users
    if (suspiciousScore > 10) {
      return Math.floor(baseLimit * 0.2); // 80% reduction
    } else if (suspiciousScore > 5) {
      return Math.floor(baseLimit * 0.5); // 50% reduction
    }
    
    return baseLimit;
  }
  
  static recordSuspiciousActivity(identifier: string, severity: number = 1): void {
    const current = this.suspiciousActivity.get(identifier) || 0;
    this.suspiciousActivity.set(identifier, current + severity);
    
    // Clean up old entries (implement TTL)
    setTimeout(() => {
      const updated = this.suspiciousActivity.get(identifier) || 0;
      if (updated > 0) {
        this.suspiciousActivity.set(identifier, Math.max(0, updated - 1));
      }
    }, 300000); // 5 minutes
  }
}