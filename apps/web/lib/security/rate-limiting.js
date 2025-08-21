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
// Initialize Redis client for rate limiting
const redis = redis_1.Redis.fromEnv();
// Rate limit configurations for different endpoints
exports.RATE_LIMITS = {
    // Authentication endpoints
    'auth/signin': { requests: 5, window: '1m' },
    'auth/signup': { requests: 3, window: '5m' },
    // API endpoints
    'api/companies/search': { requests: 100, window: '1h' },
    'api/emails/process': { requests: 10, window: '1m' },
    'api/reports/generate': { requests: 5, window: '1h' },
    // AI endpoints (more restrictive)
    'api/ai/extract': { requests: 20, window: '1h' },
    'api/ai/analyze': { requests: 10, window: '1h' },
    // Monitoring endpoints
    'api/monitoring/error': { requests: 50, window: '1m' },
    'api/monitoring/performance': { requests: 100, window: '1m' },
    // Generic API rate limit
    'api/*': { requests: 200, window: '1h' },
    // Global rate limit per IP
    'global': { requests: 1000, window: '1h' }
};
// Create rate limiters
const rateLimiters = new Map();
function getRateLimiter(endpoint) {
    if (rateLimiters.has(endpoint)) {
        return rateLimiters.get(endpoint);
    }
    const config = exports.RATE_LIMITS[endpoint] || exports.RATE_LIMITS['api/*'];
    const ratelimit = new ratelimit_1.Ratelimit({
        redis,
        limiter: ratelimit_1.Ratelimit.slidingWindow(config.requests, config.window),
        analytics: true,
        prefix: `ratelimit:${endpoint}`
    });
    rateLimiters.set(endpoint, ratelimit);
    return ratelimit;
}
async function checkRateLimit(request, endpoint) {
    // Get client identifier (prefer authenticated user, fallback to IP)
    const identifier = getClientIdentifier(request);
    // Determine endpoint for rate limiting
    const rateLimitEndpoint = endpoint || extractEndpoint(request);
    try {
        const ratelimit = getRateLimiter(rateLimitEndpoint);
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