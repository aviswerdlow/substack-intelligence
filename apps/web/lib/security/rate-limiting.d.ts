import { NextRequest } from 'next/server';
export declare const RATE_LIMITS: {
    readonly 'auth/signin': {
        readonly requests: number;
        readonly window: "1m";
    };
    readonly 'auth/signup': {
        readonly requests: number;
        readonly window: "5m";
    };
    readonly 'api/companies': {
        readonly requests: number;
        readonly window: "1h";
    };
    readonly 'api/emails/extract': {
        readonly requests: number;
        readonly window: "1m";
    };
    readonly 'api/reports/generate': {
        readonly requests: number;
        readonly window: "1h";
    };
    readonly 'api/todos': {
        readonly requests: number;
        readonly window: "1h";
    };
    readonly 'api/todos/stats': {
        readonly requests: number;
        readonly window: "1h";
    };
    readonly 'api/todos/batch': {
        readonly requests: number;
        readonly window: "1h";
    };
    readonly 'api/todos/reorder': {
        readonly requests: number;
        readonly window: "1h";
    };
    readonly 'api/test/anthropic': {
        readonly requests: number;
        readonly window: "1h";
    };
    readonly 'api/test/extract': {
        readonly requests: number;
        readonly window: "1h";
    };
    readonly 'api/test/extract-all': {
        readonly requests: number;
        readonly window: "1h";
    };
    readonly 'api/test/extract-batch': {
        readonly requests: number;
        readonly window: "1h";
    };
    readonly 'api/monitoring/error': {
        readonly requests: number;
        readonly window: "1m";
    };
    readonly 'api/monitoring/performance': {
        readonly requests: number;
        readonly window: "1m";
    };
    readonly 'api/health': {
        readonly requests: 500;
        readonly window: "1m";
    };
    readonly 'api/config/validate': {
        readonly requests: number;
        readonly window: "1h";
    };
    readonly 'api/*': {
        readonly requests: number;
        readonly window: "1h";
    };
    readonly global: {
        readonly requests: number;
        readonly window: "1h";
    };
};
export interface RateLimitResult {
    success: boolean;
    remaining: number;
    reset: Date;
    limit: number;
}
export declare function checkRateLimit(request: NextRequest, endpoint?: string): Promise<RateLimitResult>;
export declare function getClientIdentifier(request: NextRequest): string;
export declare function extractEndpoint(request: NextRequest): string;
export declare function withRateLimit(request: NextRequest, endpoint?: string): Promise<Response | null>;
export declare class BurstProtection {
    private static instance;
    private burstLimits;
    static getInstance(): BurstProtection;
    checkBurstLimit(identifier: string, operation: string, limit?: number, window?: string): Promise<boolean>;
}
export declare const burstProtection: BurstProtection;
export declare function isValidIP(ip: string): boolean;
export declare const BLOCKED_IPS: Set<never>;
export declare const ALLOWED_COUNTRIES: Set<string>;
export declare function isIPBlocked(ip: string): boolean;
export declare class AdaptiveRateLimiting {
    private static suspiciousActivity;
    static adjustLimits(identifier: string, endpoint: string): Promise<number>;
    static recordSuspiciousActivity(identifier: string, severity?: number): void;
}
//# sourceMappingURL=rate-limiting.d.ts.map