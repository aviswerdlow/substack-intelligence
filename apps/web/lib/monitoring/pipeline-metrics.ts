interface PipelineMetrics {
  // Execution metrics
  executionTime: number;
  emailsFetched: number;
  emailsProcessed: number;
  companiesExtracted: number;
  newCompanies: number;
  totalMentions: number;
  
  // Error metrics
  errors: Array<{
    type: string;
    message: string;
    timestamp: string;
    context?: Record<string, any>;
  }>;
  
  // Performance metrics
  gmailApiCalls: number;
  extractionApiCalls: number;
  databaseOperations: number;
  
  // Health metrics
  configurationValid: boolean;
  gmailHealthy: boolean;
  databaseHealthy: boolean;
}

interface PipelineEvent {
  type: 'started' | 'step_completed' | 'step_failed' | 'completed' | 'failed';
  step?: string;
  timestamp: string;
  duration?: number;
  data?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class PipelineMonitor {
  private sessionId: string;
  private startTime: number;
  private events: PipelineEvent[] = [];
  private metrics: Partial<PipelineMetrics> = {};

  constructor() {
    this.sessionId = `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
    this.metrics = {
      executionTime: 0,
      emailsFetched: 0,
      emailsProcessed: 0,
      companiesExtracted: 0,
      newCompanies: 0,
      totalMentions: 0,
      errors: [],
      gmailApiCalls: 0,
      extractionApiCalls: 0,
      databaseOperations: 0,
      configurationValid: true,
      gmailHealthy: true,
      databaseHealthy: true
    };
  }

  // Event logging
  logEvent(type: PipelineEvent['type'], step?: string, data?: Record<string, any>, error?: PipelineEvent['error']) {
    const event: PipelineEvent = {
      type,
      step,
      timestamp: new Date().toISOString(),
      data,
      error
    };

    if (this.events.length > 0) {
      event.duration = Date.now() - new Date(this.events[this.events.length - 1].timestamp).getTime();
    }

    this.events.push(event);

    // Also log to console with structured format
    const logLevel = error ? 'error' : type === 'failed' ? 'error' : 'info';
    const logData = {
      sessionId: this.sessionId,
      type,
      step,
      duration: event.duration,
      ...data,
      ...(error && { error: error.message })
    };

    console.log(`[PIPELINE:${logLevel.toUpperCase()}]`, JSON.stringify(logData));
  }

  // Step tracking
  startStep(step: string, context?: Record<string, any>) {
    this.logEvent('started', step, { ...context, stepStartTime: Date.now() });
  }

  completeStep(step: string, metrics?: Record<string, any>) {
    this.logEvent('step_completed', step, metrics);
  }

  failStep(step: string, error: Error, context?: Record<string, any>) {
    this.logEvent('step_failed', step, context, {
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    });
    
    this.metrics.errors!.push({
      type: step,
      message: error.message,
      timestamp: new Date().toISOString(),
      context
    });
  }

  // Metrics tracking
  incrementCounter(metric: keyof PipelineMetrics, value: number = 1) {
    if (typeof this.metrics[metric] === 'number') {
      (this.metrics[metric] as number) += value;
    }
  }

  setMetric(metric: keyof PipelineMetrics, value: any) {
    (this.metrics as any)[metric] = value;
  }

  // Gmail API tracking
  trackGmailApiCall(operation: string, success: boolean, duration?: number, error?: Error) {
    this.incrementCounter('gmailApiCalls');
    
    const eventData = {
      operation,
      success,
      duration,
      apiCall: 'gmail'
    };

    if (success) {
      this.logEvent('step_completed', `gmail_${operation}`, eventData);
    } else {
      this.logEvent('step_failed', `gmail_${operation}`, eventData, {
        message: error?.message || 'Gmail API call failed'
      });
    }
  }

  // Database operation tracking
  trackDatabaseOperation(operation: string, table: string, count?: number, success: boolean = true, error?: Error) {
    this.incrementCounter('databaseOperations');
    
    const eventData = {
      operation,
      table,
      count,
      success,
      dbOperation: true
    };

    if (success) {
      this.logEvent('step_completed', `db_${operation}`, eventData);
    } else {
      this.logEvent('step_failed', `db_${operation}`, eventData, {
        message: error?.message || 'Database operation failed'
      });
      this.setMetric('databaseHealthy', false);
    }
  }

  // AI/Extraction tracking
  trackExtractionOperation(emailId: string, companiesFound: number, success: boolean = true, error?: Error) {
    this.incrementCounter('extractionApiCalls');
    
    const eventData = {
      emailId,
      companiesFound,
      success,
      extraction: true
    };

    if (success) {
      this.logEvent('step_completed', 'company_extraction', eventData);
      this.incrementCounter('companiesExtracted', companiesFound);
    } else {
      this.logEvent('step_failed', 'company_extraction', eventData, {
        message: error?.message || 'Company extraction failed'
      });
    }
  }

  // Health status tracking
  setHealthStatus(component: 'configuration' | 'gmail' | 'database', healthy: boolean, error?: string) {
    switch (component) {
      case 'configuration':
        this.setMetric('configurationValid', healthy);
        break;
      case 'gmail':
        this.setMetric('gmailHealthy', healthy);
        break;
      case 'database':
        this.setMetric('databaseHealthy', healthy);
        break;
    }

    if (!healthy && error) {
      this.metrics.errors!.push({
        type: `${component}_health`,
        message: error,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Session completion
  complete(success: boolean, finalStats?: Record<string, any>) {
    this.metrics.executionTime = Date.now() - this.startTime;
    
    if (success) {
      this.logEvent('completed', undefined, {
        ...finalStats,
        sessionDuration: this.metrics.executionTime,
        totalEvents: this.events.length,
        metrics: this.metrics
      });
    } else {
      this.logEvent('failed', undefined, {
        sessionDuration: this.metrics.executionTime,
        totalEvents: this.events.length,
        errorCount: this.metrics.errors!.length,
        metrics: this.metrics
      });
    }

    // Log performance summary
    this.logPerformanceSummary();
    
    return {
      sessionId: this.sessionId,
      success,
      metrics: this.metrics,
      events: this.events,
      summary: this.generateSummary()
    };
  }

  // Performance analysis
  private logPerformanceSummary() {
    const summary = {
      sessionId: this.sessionId,
      totalDuration: this.metrics.executionTime,
      eventsCount: this.events.length,
      errorsCount: this.metrics.errors!.length,
      performance: {
        emailsFetched: this.metrics.emailsFetched,
        emailsProcessed: this.metrics.emailsProcessed,
        companiesExtracted: this.metrics.companiesExtracted,
        avgTimePerEmail: this.metrics.emailsProcessed! > 0 
          ? Math.round(this.metrics.executionTime! / this.metrics.emailsProcessed!) 
          : 0,
        gmailApiCalls: this.metrics.gmailApiCalls,
        databaseOperations: this.metrics.databaseOperations,
        extractionApiCalls: this.metrics.extractionApiCalls
      },
      health: {
        configurationValid: this.metrics.configurationValid,
        gmailHealthy: this.metrics.gmailHealthy,
        databaseHealthy: this.metrics.databaseHealthy
      }
    };

    console.log('[PIPELINE:SUMMARY]', JSON.stringify(summary, null, 2));
  }

  private generateSummary(): string {
    const duration = Math.round(this.metrics.executionTime! / 1000);
    const errors = this.metrics.errors!.length;
    
    if (errors === 0) {
      return `Pipeline completed successfully in ${duration}s. Processed ${this.metrics.emailsProcessed} emails, extracted ${this.metrics.companiesExtracted} companies.`;
    } else {
      return `Pipeline completed with ${errors} errors in ${duration}s. Processed ${this.metrics.emailsProcessed} emails, extracted ${this.metrics.companiesExtracted} companies.`;
    }
  }

  // Get current metrics for external monitoring
  getCurrentMetrics(): PipelineMetrics {
    return {
      ...this.metrics,
      executionTime: Date.now() - this.startTime
    } as PipelineMetrics;
  }

  // Export events for external logging systems
  exportEvents(): PipelineEvent[] {
    return [...this.events];
  }
}

// Utility functions for external monitoring systems
export const createPipelineAlert = (
  type: 'error' | 'warning' | 'info',
  title: string,
  message: string,
  metrics?: Record<string, any>
) => {
  const alert = {
    timestamp: new Date().toISOString(),
    type,
    title,
    message,
    source: 'gmail-pipeline',
    metrics
  };

  // Log alert in a format that external systems can parse
  console.log(`[PIPELINE:ALERT:${type.toUpperCase()}]`, JSON.stringify(alert));
  
  // In production, you could send this to external monitoring services:
  // - Datadog, New Relic, Sentry, etc.
  // - Slack/Discord webhooks for critical alerts
  // - Email notifications for failures
  
  return alert;
};

export const logPipelineHealthCheck = (
  component: string,
  status: 'healthy' | 'unhealthy',
  details?: Record<string, any>
) => {
  const healthCheck = {
    timestamp: new Date().toISOString(),
    component,
    status,
    details
  };

  console.log(`[PIPELINE:HEALTH]`, JSON.stringify(healthCheck));
  return healthCheck;
};

export { PipelineMonitor };
export type { PipelineMetrics, PipelineEvent };