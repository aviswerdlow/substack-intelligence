declare class AxiomLogger {
    private axiom;
    private isEnabled;
    constructor();
    log(dataset: string, event: string, data?: Record<string, any>): Promise<void>;
    logAppEvent(event: string, data?: Record<string, any>): Promise<void>;
    logEmailEvent(event: string, data?: Record<string, any>): Promise<void>;
    logExtractionEvent(event: string, data?: Record<string, any>): Promise<void>;
    logApiRequest(method: string, path: string, statusCode: number, duration: number, userId?: string, error?: any): Promise<void>;
    logDatabaseEvent(event: string, data?: Record<string, any>): Promise<void>;
    logSecurityEvent(event: string, request?: any, data?: Record<string, any>): Promise<void>;
    logReportEvent(event: string, data?: Record<string, any>): Promise<void>;
    logError(error: Error, context?: Record<string, any>): Promise<void>;
    logPerformance(operation: string, duration: number, metadata?: Record<string, any>): Promise<void>;
    logBusinessMetric(metric: string, value: number, metadata?: Record<string, any>): Promise<void>;
    logUserActivity(userId: string, action: string, data?: Record<string, any>): Promise<void>;
    logHealthCheck(service: string, status: 'healthy' | 'unhealthy', data?: Record<string, any>): Promise<void>;
    logBatch(dataset: string, events: Array<{
        event: string;
        data: Record<string, any>;
    }>): Promise<void>;
}
export declare const axiomLogger: AxiomLogger;
export declare const logEvent: (event: string, data?: Record<string, any>) => Promise<void>;
export declare const logError: (error: Error, context?: Record<string, any>) => Promise<void>;
export declare const logPerformance: (operation: string, duration: number, metadata?: Record<string, any>) => Promise<void>;
export declare const logApiRequest: (method: string, path: string, statusCode: number, duration: number, userId?: string, error?: any) => Promise<void>;
export declare function withPerformanceLogging<T extends any[], R>(operation: string, fn: (...args: T) => Promise<R>): (...args: T) => Promise<R>;
export {};
//# sourceMappingURL=axiom.d.ts.map