"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logApiRequest = exports.logPerformance = exports.logError = exports.logEvent = exports.axiomLogger = void 0;
exports.withPerformanceLogging = withPerformanceLogging;
const js_1 = require("@axiomhq/js");
class AxiomLogger {
    constructor() {
        this.axiom = null;
        this.isEnabled = false;
        if (process.env.AXIOM_TOKEN && process.env.AXIOM_ORG_ID) {
            this.axiom = new js_1.Axiom({
                token: process.env.AXIOM_TOKEN,
                orgId: process.env.AXIOM_ORG_ID,
            });
            this.isEnabled = true;
            console.log('Axiom logging initialized');
        }
        else {
            console.warn('Axiom not configured - logging to console only');
        }
    }
    async log(dataset, event, data = {}) {
        const logEntry = {
            _time: new Date().toISOString(),
            event,
            environment: process.env.NODE_ENV || 'unknown',
            service: 'substack-intelligence',
            version: process.env.npm_package_version || '1.0.0',
            ...data
        };
        // Always log to console for development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${dataset}] ${event}:`, logEntry);
        }
        // Send to Axiom if enabled
        if (this.isEnabled && this.axiom) {
            try {
                await this.axiom.ingest(dataset, [logEntry]);
            }
            catch (error) {
                console.error('Failed to send log to Axiom:', error);
            }
        }
    }
    // Application Events
    async logAppEvent(event, data = {}) {
        await this.log('app-events', event, data);
    }
    // Email Processing Events
    async logEmailEvent(event, data = {}) {
        await this.log('email-processing', event, {
            ...data,
            component: 'gmail-connector'
        });
    }
    // AI Extraction Events
    async logExtractionEvent(event, data = {}) {
        await this.log('ai-extraction', event, {
            ...data,
            component: 'claude-extractor'
        });
    }
    // API Request Events
    async logApiRequest(method, path, statusCode, duration, userId, error) {
        await this.log('api-requests', 'request', {
            method,
            path,
            statusCode,
            duration,
            userId,
            error: error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : undefined,
            success: statusCode < 400
        });
    }
    // Database Operations
    async logDatabaseEvent(event, data = {}) {
        await this.log('database', event, {
            ...data,
            component: 'supabase'
        });
    }
    // Report Generation Events
    async logReportEvent(event, data = {}) {
        await this.log('reports', event, {
            ...data,
            component: 'report-generator'
        });
    }
    // Error Events
    async logError(error, context = {}) {
        await this.log('errors', 'error', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            ...context
        });
    }
    // Performance Metrics
    async logPerformance(operation, duration, metadata = {}) {
        await this.log('performance', 'timing', {
            operation,
            duration,
            ...metadata
        });
    }
    // Business Metrics
    async logBusinessMetric(metric, value, metadata = {}) {
        await this.log('business-metrics', metric, {
            value,
            ...metadata
        });
    }
    // User Activity
    async logUserActivity(userId, action, data = {}) {
        await this.log('user-activity', action, {
            userId,
            ...data
        });
    }
    // System Health
    async logHealthCheck(service, status, data = {}) {
        await this.log('health-checks', 'check', {
            service,
            status,
            ...data
        });
    }
    // Batch logging for high-volume events
    async logBatch(dataset, events) {
        if (!this.isEnabled || !this.axiom)
            return;
        const logEntries = events.map(({ event, data }) => ({
            _time: new Date().toISOString(),
            event,
            environment: process.env.NODE_ENV || 'unknown',
            service: 'substack-intelligence',
            version: process.env.npm_package_version || '1.0.0',
            ...data
        }));
        try {
            await this.axiom.ingest(dataset, logEntries);
        }
        catch (error) {
            console.error('Failed to send batch logs to Axiom:', error);
        }
    }
}
// Create singleton instance
exports.axiomLogger = new AxiomLogger();
// Convenience functions for common logging patterns
const logEvent = (event, data) => exports.axiomLogger.logAppEvent(event, data);
exports.logEvent = logEvent;
const logError = (error, context) => exports.axiomLogger.logError(error, context);
exports.logError = logError;
const logPerformance = (operation, duration, metadata) => exports.axiomLogger.logPerformance(operation, duration, metadata);
exports.logPerformance = logPerformance;
const logApiRequest = (method, path, statusCode, duration, userId, error) => exports.axiomLogger.logApiRequest(method, path, statusCode, duration, userId, error);
exports.logApiRequest = logApiRequest;
// Performance measurement decorator
function withPerformanceLogging(operation, fn) {
    return async (...args) => {
        const start = Date.now();
        try {
            const result = await fn(...args);
            const duration = Date.now() - start;
            await (0, exports.logPerformance)(operation, duration, { success: true });
            return result;
        }
        catch (error) {
            const duration = Date.now() - start;
            await (0, exports.logPerformance)(operation, duration, { success: false });
            await (0, exports.logError)(error, { operation });
            throw error;
        }
    };
}
//# sourceMappingURL=axiom.js.map