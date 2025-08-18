import { Axiom } from '@axiomhq/js';

class AxiomLogger {
  private axiom: Axiom | null = null;
  private isEnabled: boolean = false;

  constructor() {
    if (process.env.AXIOM_TOKEN && process.env.AXIOM_ORG_ID) {
      this.axiom = new Axiom({
        token: process.env.AXIOM_TOKEN,
        orgId: process.env.AXIOM_ORG_ID,
      });
      this.isEnabled = true;
      console.log('Axiom logging initialized');
    } else {
      console.warn('Axiom not configured - logging to console only');
    }
  }

  async log(dataset: string, event: string, data: Record<string, any> = {}) {
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
      } catch (error) {
        console.error('Failed to send log to Axiom:', error);
      }
    }
  }

  // Application Events
  async logAppEvent(event: string, data: Record<string, any> = {}) {
    await this.log('app-events', event, data);
  }

  // Email Processing Events
  async logEmailEvent(event: string, data: Record<string, any> = {}) {
    await this.log('email-processing', event, {
      ...data,
      component: 'gmail-connector'
    });
  }

  // AI Extraction Events
  async logExtractionEvent(event: string, data: Record<string, any> = {}) {
    await this.log('ai-extraction', event, {
      ...data,
      component: 'claude-extractor'
    });
  }

  // API Request Events
  async logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string,
    error?: any
  ) {
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
  async logDatabaseEvent(event: string, data: Record<string, any> = {}) {
    await this.log('database', event, {
      ...data,
      component: 'supabase'
    });
  }

  // Report Generation Events
  async logReportEvent(event: string, data: Record<string, any> = {}) {
    await this.log('reports', event, {
      ...data,
      component: 'report-generator'
    });
  }

  // Error Events
  async logError(error: Error, context: Record<string, any> = {}) {
    await this.log('errors', 'error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    });
  }

  // Performance Metrics
  async logPerformance(operation: string, duration: number, metadata: Record<string, any> = {}) {
    await this.log('performance', 'timing', {
      operation,
      duration,
      ...metadata
    });
  }

  // Business Metrics
  async logBusinessMetric(metric: string, value: number, metadata: Record<string, any> = {}) {
    await this.log('business-metrics', metric, {
      value,
      ...metadata
    });
  }

  // User Activity
  async logUserActivity(userId: string, action: string, data: Record<string, any> = {}) {
    await this.log('user-activity', action, {
      userId,
      ...data
    });
  }

  // System Health
  async logHealthCheck(service: string, status: 'healthy' | 'unhealthy', data: Record<string, any> = {}) {
    await this.log('health-checks', 'check', {
      service,
      status,
      ...data
    });
  }

  // Batch logging for high-volume events
  async logBatch(dataset: string, events: Array<{ event: string; data: Record<string, any> }>) {
    if (!this.isEnabled || !this.axiom) return;

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
    } catch (error) {
      console.error('Failed to send batch logs to Axiom:', error);
    }
  }
}

// Create singleton instance
export const axiomLogger = new AxiomLogger();

// Convenience functions for common logging patterns
export const logEvent = (event: string, data?: Record<string, any>) => 
  axiomLogger.logAppEvent(event, data);

export const logError = (error: Error, context?: Record<string, any>) => 
  axiomLogger.logError(error, context);

export const logPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => 
  axiomLogger.logPerformance(operation, duration, metadata);

export const logApiRequest = (
  method: string, 
  path: string, 
  statusCode: number, 
  duration: number, 
  userId?: string, 
  error?: any
) => axiomLogger.logApiRequest(method, path, statusCode, duration, userId, error);

// Performance measurement decorator
export function withPerformanceLogging<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      await logPerformance(operation, duration, { success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      await logPerformance(operation, duration, { success: false });
      await logError(error as Error, { operation });
      throw error;
    }
  };
}