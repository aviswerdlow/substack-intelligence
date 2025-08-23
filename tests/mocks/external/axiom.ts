import { vi } from 'vitest';

// Axiom logging types
export interface MockAxiomLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
  source?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  environment?: string;
  service?: string;
  version?: string;
}

export interface MockAxiomEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

export interface MockAxiomMetric {
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface MockAxiomError {
  error: Error | string;
  context?: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  stack?: string;
}

// Axiom mock configuration
interface AxiomMockConfig {
  shouldResolve: boolean;
  resolveValue?: any;
  rejectValue?: any;
  delay?: number;
  collectLogs: boolean;
  collectEvents: boolean;
  collectMetrics: boolean;
  collectErrors: boolean;
}

class AxiomMocks {
  private _config: AxiomMockConfig = {
    shouldResolve: true,
    delay: 0,
    collectLogs: true,
    collectEvents: true,
    collectMetrics: true,
    collectErrors: true
  };

  // Collected data for inspection
  private _collectedLogs: MockAxiomLogEntry[] = [];
  private _collectedEvents: MockAxiomEvent[] = [];
  private _collectedMetrics: MockAxiomMetric[] = [];
  private _collectedErrors: MockAxiomError[] = [];

  // Configuration methods
  configure(config: Partial<AxiomMockConfig>): void {
    this._config = { ...this._config, ...config };
  }

  reset(): void {
    this._config = {
      shouldResolve: true,
      delay: 0,
      collectLogs: true,
      collectEvents: true,
      collectMetrics: true,
      collectErrors: true
    };
    this.clearCollectedData();
  }

  clearCollectedData(): void {
    this._collectedLogs.length = 0;
    this._collectedEvents.length = 0;
    this._collectedMetrics.length = 0;
    this._collectedErrors.length = 0;
  }

  // Data accessors for testing
  getCollectedLogs(): MockAxiomLogEntry[] {
    return [...this._collectedLogs];
  }

  getCollectedEvents(): MockAxiomEvent[] {
    return [...this._collectedEvents];
  }

  getCollectedMetrics(): MockAxiomMetric[] {
    return [...this._collectedMetrics];
  }

  getCollectedErrors(): MockAxiomError[] {
    return [...this._collectedErrors];
  }

  // Helper method to execute with config
  private async executeWithConfig(data?: any): Promise<void> {
    if (this._config.delay) {
      await new Promise(resolve => setTimeout(resolve, this._config.delay));
    }

    if (!this._config.shouldResolve) {
      throw this._config.rejectValue || new Error('Axiom logging failed');
    }

    return this._config.resolveValue;
  }

  // Core logging methods
  log = vi.fn(async (message: string, data?: Record<string, any>, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): Promise<void> => {
    if (this._config.collectLogs) {
      this._collectedLogs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
        source: 'test'
      });
    }
    return this.executeWithConfig();
  });

  logError = vi.fn(async (error: Error | string, context?: Record<string, any>): Promise<void> => {
    if (this._config.collectErrors) {
      this._collectedErrors.push({
        error,
        context,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    return this.executeWithConfig();
  });

  // Application event logging
  logAppEvent = vi.fn(async (event: string, properties: Record<string, any>): Promise<void> => {
    if (this._config.collectEvents) {
      this._collectedEvents.push({
        event: `app.${event}`,
        properties,
        timestamp: new Date().toISOString()
      });
    }
    return this.executeWithConfig();
  });

  logEmailEvent = vi.fn(async (event: string, emailData: Record<string, any>): Promise<void> => {
    if (this._config.collectEvents) {
      this._collectedEvents.push({
        event: `email.${event}`,
        properties: emailData,
        timestamp: new Date().toISOString()
      });
    }
    return this.executeWithConfig();
  });

  logExtractionEvent = vi.fn(async (event: string, extractionData: Record<string, any>): Promise<void> => {
    if (this._config.collectEvents) {
      this._collectedEvents.push({
        event: `extraction.${event}`,
        properties: extractionData,
        timestamp: new Date().toISOString()
      });
    }
    return this.executeWithConfig();
  });

  logApiRequest = vi.fn(async (method: string, endpoint: string, data: Record<string, any>): Promise<void> => {
    if (this._config.collectEvents) {
      this._collectedEvents.push({
        event: 'api.request',
        properties: {
          method,
          endpoint,
          ...data
        },
        timestamp: new Date().toISOString()
      });
    }
    return this.executeWithConfig();
  });

  logDatabaseEvent = vi.fn(async (event: string, dbData: Record<string, any>): Promise<void> => {
    if (this._config.collectEvents) {
      this._collectedEvents.push({
        event: `database.${event}`,
        properties: dbData,
        timestamp: new Date().toISOString()
      });
    }
    return this.executeWithConfig();
  });

  logSecurityEvent = vi.fn(async (event: string, securityData: Record<string, any>): Promise<void> => {
    if (this._config.collectEvents) {
      this._collectedEvents.push({
        event: `security.${event}`,
        properties: securityData,
        timestamp: new Date().toISOString()
      });
    }
    return this.executeWithConfig();
  });

  logReportEvent = vi.fn(async (event: string, reportData: Record<string, any>): Promise<void> => {
    if (this._config.collectEvents) {
      this._collectedEvents.push({
        event: `report.${event}`,
        properties: reportData,
        timestamp: new Date().toISOString()
      });
    }
    return this.executeWithConfig();
  });

  // Performance and metrics logging
  logPerformance = vi.fn(async (operation: string, duration: number, metadata?: Record<string, any>): Promise<void> => {
    if (this._config.collectMetrics) {
      this._collectedMetrics.push({
        name: `performance.${operation}`,
        value: duration,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: metadata
      });
    }
    return this.executeWithConfig();
  });

  logBusinessMetric = vi.fn(async (metric: string, value: number, unit?: string, tags?: Record<string, string>): Promise<void> => {
    if (this._config.collectMetrics) {
      this._collectedMetrics.push({
        name: `business.${metric}`,
        value,
        unit,
        timestamp: new Date().toISOString(),
        tags
      });
    }
    return this.executeWithConfig();
  });

  logUserActivity = vi.fn(async (userId: string, activity: string, properties: Record<string, any>): Promise<void> => {
    if (this._config.collectEvents) {
      this._collectedEvents.push({
        event: `user.${activity}`,
        properties,
        timestamp: new Date().toISOString(),
        userId
      });
    }
    return this.executeWithConfig();
  });

  logHealthCheck = vi.fn(async (service: string, status: 'healthy' | 'unhealthy' | 'degraded', details?: Record<string, any>): Promise<void> => {
    if (this._config.collectEvents) {
      this._collectedEvents.push({
        event: 'health.check',
        properties: {
          service,
          status,
          ...details
        },
        timestamp: new Date().toISOString()
      });
    }
    return this.executeWithConfig();
  });

  // Batch logging
  logBatch = vi.fn(async (entries: Array<{
    message: string;
    level?: 'debug' | 'info' | 'warn' | 'error';
    data?: Record<string, any>;
  }>): Promise<void> => {
    if (this._config.collectLogs) {
      entries.forEach(entry => {
        this._collectedLogs.push({
          timestamp: new Date().toISOString(),
          level: entry.level || 'info',
          message: entry.message,
          data: entry.data,
          source: 'batch'
        });
      });
    }
    return this.executeWithConfig();
  });

  // Utility methods for test scenarios
  mockSuccessfulLogging(): void {
    this.configure({ shouldResolve: true });
  }

  mockLoggingError(error?: any): void {
    this.configure({
      shouldResolve: false,
      rejectValue: error || new Error('Axiom logging failed')
    });
  }

  mockSlowLogging(delay: number = 1000): void {
    this.configure({ delay });
  }

  disableCollection(): void {
    this.configure({
      collectLogs: false,
      collectEvents: false,
      collectMetrics: false,
      collectErrors: false
    });
  }

  enableCollection(): void {
    this.configure({
      collectLogs: true,
      collectEvents: true,
      collectMetrics: true,
      collectErrors: true
    });
  }

  // Test assertion helpers
  assertLoggedMessage(message: string): boolean {
    return this._collectedLogs.some(log => log.message === message);
  }

  assertLoggedError(error: string | Error): boolean {
    if (typeof error === 'string') {
      return this._collectedErrors.some(e => 
        (typeof e.error === 'string' && e.error === error) ||
        (e.error instanceof Error && e.error.message === error)
      );
    }
    return this._collectedErrors.some(e => e.error === error);
  }

  assertLoggedEvent(event: string): boolean {
    return this._collectedEvents.some(e => e.event === event);
  }

  assertLoggedMetric(metric: string): boolean {
    return this._collectedMetrics.some(m => m.name === metric);
  }

  getLogCount(): number {
    return this._collectedLogs.length;
  }

  getEventCount(): number {
    return this._collectedEvents.length;
  }

  getMetricCount(): number {
    return this._collectedMetrics.length;
  }

  getErrorCount(): number {
    return this._collectedErrors.length;
  }

  // Reset all mocks
  resetAllMocks(): void {
    Object.getOwnPropertyNames(this)
      .filter(name => typeof (this as any)[name]?.mockReset === 'function')
      .forEach(name => (this as any)[name].mockReset());
    
    this.reset();
  }
}

// Export singleton instance
export const axiomMocks = new AxiomMocks();

// Export individual mocks for direct use
export const {
  log,
  logError,
  logAppEvent,
  logEmailEvent,
  logExtractionEvent,
  logApiRequest,
  logDatabaseEvent,
  logSecurityEvent,
  logReportEvent,
  logPerformance,
  logBusinessMetric,
  logUserActivity,
  logHealthCheck,
  logBatch
} = axiomMocks;

// Mock implementation for vi.mock()
export const axiomLogger = {
  log,
  logError,
  logAppEvent,
  logEmailEvent,
  logExtractionEvent,
  logApiRequest,
  logDatabaseEvent,
  logSecurityEvent,
  logReportEvent,
  logPerformance,
  logBusinessMetric,
  logUserActivity,
  logHealthCheck,
  logBatch
};

// Pre-configured test scenarios
export const axiomTestScenarios = {
  normalLogging: () => {
    axiomMocks.mockSuccessfulLogging();
    axiomMocks.enableCollection();
  },

  loggingFailure: () => {
    axiomMocks.mockLoggingError();
  },

  slowLogging: () => {
    axiomMocks.mockSuccessfulLogging();
    axiomMocks.mockSlowLogging(2000);
  },

  silentMode: () => {
    axiomMocks.mockSuccessfulLogging();
    axiomMocks.disableCollection();
  }
};