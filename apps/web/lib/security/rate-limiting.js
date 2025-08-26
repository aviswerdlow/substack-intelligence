"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveRateLimiting = exports.ALLOWED_COUNTRIES = exports.BLOCKED_IPS = exports.burstProtection = exports.BurstProtection = exports.RATE_LIMITS = void 0;
exports.checkRateLimit = checkRateLimit;
exports.getClientIdentifier = getClientIdentifier;
exports.extractEndpoint = extractEndpoint;
exports.withRateLimit = withRateLimit;
exports.isValidIP = isValidIP;
exports.isIPBlocked = isIPBlocked;
const ratelimit_1 = require("@upstash/ratelimit");
const redis_1 = require("@upstash/redis");
// Initialize Redis client for rate limiting with fallback
let redis = null;
let rateLimitingEnabled = false;
try {
    // Only initialize Redis if environment variables are properly configured
    if (process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN &&
        !process.env.UPSTASH_REDIS_REST_URL.includes('your-redis')) {
        redis = redis_1.Redis.fromEnv();
        rateLimitingEnabled = true;
        console.log('Rate limiting enabled with Redis');
    }
    else {
        console.log('Rate limiting disabled - Redis not configured');
    }
}
catch (error) {
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
        // Todo API endpoints
        'api/todos': { requests: Math.floor(200 * multiplier), window: '1h' },
        'api/todos/stats': { requests: Math.floor(50 * multiplier), window: '1h' },
        'api/todos/batch': { requests: Math.floor(20 * multiplier), window: '1h' }, // More restrictive for batch operations
        'api/todos/reorder': { requests: Math.floor(30 * multiplier), window: '1h' },
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
    };
};
exports.RATE_LIMITS = getProductionLimits();
// Create rate limiters
const rateLimiters = new Map();
function getRateLimiter(endpoint) {
    // Return null if rate limiting is disabled
    if (!rateLimitingEnabled || !redis) {
        return null;
    }
    if (rateLimiters.has(endpoint)) {
        return rateLimiters.get(endpoint);
    }
    const config = exports.RATE_LIMITS[endpoint] || exports.RATE_LIMITS['api/*'];
    const ratelimit = new ratelimit_1.Ratelimit({
        redis: redis,
        limiter: ratelimit_1.Ratelimit.slidingWindow(config.requests, config.window),
        analytics: true,
        prefix: `ratelimit:${endpoint}`
    });
    rateLimiters.set(endpoint, ratelimit);
    return ratelimit;
}
async function checkRateLimit(request, endpoint) {
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
    }
    catch (error) {
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
function getClientIdentifier(request) {
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
function extractEndpoint(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    // Match specific endpoints
    for (const [endpoint] of Object.entries(exports.RATE_LIMITS)) {
        if (endpoint.includes('*')) {
            const pattern = endpoint.replace('*', '.*');
            if (new RegExp(pattern).test(pathname)) {
                return endpoint;
            }
        }
        else if (pathname.includes(endpoint)) {
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
async function withRateLimit(request, endpoint) {
    const result = await checkRateLimit(request, endpoint);
    if (!result.success) {
        return new Response(JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((result.reset.getTime() - Date.now()) / 1000)
        }), {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': result.limit.toString(),
                'X-RateLimit-Remaining': result.remaining.toString(),
                'X-RateLimit-Reset': result.reset.toISOString(),
                'Retry-After': Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString()
            }
        });
    }
    return null; // Continue with request
}
// Burst protection for expensive operations
class BurstProtection {
    constructor() {
        this.burstLimits = new Map();
    }
    static getInstance() {
        if (!BurstProtection.instance) {
            BurstProtection.instance = new BurstProtection();
        }
        return BurstProtection.instance;
    }
    async checkBurstLimit(identifier, operation, limit = 3, window = '1m') {
        const key = `${operation}:${identifier}`;
        if (!this.burstLimits.has(key)) {
            this.burstLimits.set(key, new ratelimit_1.Ratelimit({
                redis,
                limiter: ratelimit_1.Ratelimit.fixedWindow(limit, window),
                prefix: `burst:${key}`
            }));
        }
        const ratelimit = this.burstLimits.get(key);
        const result = await ratelimit.limit(identifier);
        return result.success;
    }
}
exports.BurstProtection = BurstProtection;
exports.burstProtection = BurstProtection.getInstance();
// IP-based security measures
function isValidIP(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
exports.BLOCKED_IPS = new Set([
// Add known malicious IPs here
// This would typically be populated from threat intelligence feeds
]);
exports.ALLOWED_COUNTRIES = new Set([
    'US', 'CA', 'GB', 'DE', 'FR', 'AU', 'NL', 'SE', 'NO', 'DK'
    // Add other allowed country codes
]);
function isIPBlocked(ip) {
    return exports.BLOCKED_IPS.has(ip);
}
// Adaptive rate limiting based on user behavior
class AdaptiveRateLimiting {
    static async adjustLimits(identifier, endpoint) {
        const baseConfig = exports.RATE_LIMITS[endpoint] || exports.RATE_LIMITS['api/*'];
        const baseLimit = baseConfig.requests;
        const suspiciousScore = this.suspiciousActivity.get(identifier) || 0;
        // Reduce limits for suspicious users
        if (suspiciousScore > 10) {
            return Math.floor(baseLimit * 0.2); // 80% reduction
        }
        else if (suspiciousScore > 5) {
            return Math.floor(baseLimit * 0.5); // 50% reduction
        }
        return baseLimit;
    }
    static recordSuspiciousActivity(identifier, severity = 1) {
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
exports.AdaptiveRateLimiting = AdaptiveRateLimiting;
AdaptiveRateLimiting.suspiciousActivity = new Map();
//# sourceMappingURL=rate-limiting.js.map