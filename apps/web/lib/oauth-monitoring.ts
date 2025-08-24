/**
 * OAuth Monitoring and Logging System
 * Tracks OAuth events, failures, and metrics for analysis and alerting
 */

export interface OAuthEvent {
  type: 'oauth_initiated' | 'oauth_success' | 'oauth_failure' | 'token_refresh' | 'connection_test';
  userId?: string;
  email?: string;
  error?: string;
  errorType?: string;
  retryAttempt?: number;
  duration?: number;
  metadata?: Record<string, any>;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface OAuthMetrics {
  totalAttempts: number;
  successfulConnections: number;
  failuresByType: Record<string, number>;
  averageConnectionTime: number;
  retryRate: number;
  lastUpdated: string;
}

class OAuthMonitor {
  private static instance: OAuthMonitor;
  private events: OAuthEvent[] = [];
  private metrics: OAuthMetrics = {
    totalAttempts: 0,
    successfulConnections: 0,
    failuresByType: {},
    averageConnectionTime: 0,
    retryRate: 0,
    lastUpdated: new Date().toISOString()
  };

  private constructor() {}

  public static getInstance(): OAuthMonitor {
    if (!OAuthMonitor.instance) {
      OAuthMonitor.instance = new OAuthMonitor();
    }
    return OAuthMonitor.instance;
  }

  /**
   * Log an OAuth event
   */
  public async logEvent(event: Omit<OAuthEvent, 'timestamp'>): Promise<void> {
    const fullEvent: OAuthEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    // Add to local events buffer
    this.events.push(fullEvent);
    
    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Update metrics
    this.updateMetrics(fullEvent);

    // Send to external monitoring systems
    await this.sendToMonitoringSystems(fullEvent);

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[OAuth Monitor] ${fullEvent.type}:`, fullEvent);
    }
  }

  /**
   * Log OAuth initiation
   */
  public async logOAuthInitiated(userId: string, metadata?: Record<string, any>): Promise<void> {
    await this.logEvent({
      type: 'oauth_initiated',
      userId,
      metadata: {
        ...metadata,
        environment: process.env.NODE_ENV,
        appUrl: process.env.NEXT_PUBLIC_APP_URL
      }
    });
  }

  /**
   * Log successful OAuth connection
   */
  public async logOAuthSuccess(userId: string, email: string, duration?: number): Promise<void> {
    await this.logEvent({
      type: 'oauth_success',
      userId,
      email,
      duration,
      metadata: {
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log OAuth failure
   */
  public async logOAuthFailure(
    errorType: string, 
    error: string, 
    userId?: string, 
    retryAttempt?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      type: 'oauth_failure',
      userId,
      error,
      errorType,
      retryAttempt,
      metadata: {
        ...metadata,
        environment: process.env.NODE_ENV,
        userAgent: metadata?.userAgent || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get current metrics
   */
  public getMetrics(): OAuthMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent events
   */
  public getRecentEvents(limit: number = 100): OAuthEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get failure rate for the last period
   */
  public getFailureRate(periodHours: number = 24): number {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - periodHours);

    const recentEvents = this.events.filter(
      event => new Date(event.timestamp) >= cutoff
    );

    const failures = recentEvents.filter(event => event.type === 'oauth_failure').length;
    const total = recentEvents.filter(event => 
      event.type === 'oauth_initiated' || event.type === 'oauth_success' || event.type === 'oauth_failure'
    ).length;

    return total > 0 ? failures / total : 0;
  }

  /**
   * Check if failure rate exceeds threshold
   */
  public isFailureRateHigh(threshold: number = 0.3, periodHours: number = 1): boolean {
    return this.getFailureRate(periodHours) > threshold;
  }

  private updateMetrics(event: OAuthEvent): void {
    if (event.type === 'oauth_initiated') {
      this.metrics.totalAttempts++;
    } else if (event.type === 'oauth_success') {
      this.metrics.successfulConnections++;
      
      if (event.duration) {
        // Update rolling average connection time
        const currentAvg = this.metrics.averageConnectionTime;
        const count = this.metrics.successfulConnections;
        this.metrics.averageConnectionTime = 
          ((currentAvg * (count - 1)) + event.duration) / count;
      }
    } else if (event.type === 'oauth_failure') {
      const errorType = event.errorType || 'unknown';
      this.metrics.failuresByType[errorType] = 
        (this.metrics.failuresByType[errorType] || 0) + 1;
      
      if (event.retryAttempt && event.retryAttempt > 1) {
        this.metrics.retryRate = 
          ((this.metrics.retryRate * (this.metrics.totalAttempts - 1)) + 1) / this.metrics.totalAttempts;
      }
    }

    this.metrics.lastUpdated = new Date().toISOString();
  }

  private async sendToMonitoringSystems(event: OAuthEvent): Promise<void> {
    // Send to Axiom if configured
    if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
      await this.sendToAxiom(event);
    }

    // Send critical alerts
    if (event.type === 'oauth_failure') {
      await this.checkAndSendAlerts(event);
    }
  }

  private async sendToAxiom(event: OAuthEvent): Promise<void> {
    try {
      const axiomEvent = {
        ...event,
        service: 'gmail-oauth',
        environment: process.env.NODE_ENV,
        version: '1.0.0',
        level: event.type === 'oauth_failure' ? 'error' : 'info'
      };

      const response = await fetch(`https://api.axiom.co/v1/datasets/${process.env.AXIOM_DATASET}/ingest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AXIOM_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([axiomEvent])
      });

      if (!response.ok) {
        console.error('Failed to send event to Axiom:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending event to Axiom:', error);
    }
  }

  private async checkAndSendAlerts(event: OAuthEvent): Promise<void> {
    // Check if we should send an alert based on failure patterns
    const recentFailureRate = this.getFailureRate(1); // Last hour
    const isHighFailureRate = this.isFailureRateHigh(0.5, 1); // 50% failure rate in last hour

    if (isHighFailureRate && this.metrics.totalAttempts > 5) {
      await this.sendAlert({
        severity: 'high',
        title: 'High OAuth Failure Rate Detected',
        message: `OAuth failure rate is ${(recentFailureRate * 100).toFixed(1)}% in the last hour`,
        details: {
          failureRate: recentFailureRate,
          totalAttempts: this.metrics.totalAttempts,
          recentFailures: this.metrics.failuresByType,
          lastEvent: event
        }
      });
    }

    // Alert on specific critical errors
    if (event.errorType === 'database_error' || event.errorType === 'configuration_error') {
      await this.sendAlert({
        severity: 'critical',
        title: `Critical OAuth Error: ${event.errorType}`,
        message: event.error || 'Unknown critical error',
        details: event
      });
    }
  }

  private async sendAlert(alert: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    details?: any;
  }): Promise<void> {
    // Log alert locally
    console.error(`[OAUTH ALERT] ${alert.severity.toUpperCase()}: ${alert.title}`, alert);

    // In production, you might send to Slack, PagerDuty, email, etc.
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Slack webhook
      if (process.env.SLACK_ALERT_WEBHOOK) {
        try {
          await fetch(process.env.SLACK_ALERT_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🚨 ${alert.title}`,
              attachments: [{
                color: alert.severity === 'critical' ? 'danger' : 'warning',
                fields: [
                  { title: 'Message', value: alert.message, short: false },
                  { title: 'Severity', value: alert.severity, short: true },
                  { title: 'Environment', value: process.env.NODE_ENV, short: true }
                ]
              }]
            })
          });
        } catch (error) {
          console.error('Failed to send Slack alert:', error);
        }
      }
    }
  }
}

// Export singleton instance
export const oauthMonitor = OAuthMonitor.getInstance();

// Convenience functions
export const logOAuthInitiated = (userId: string, metadata?: Record<string, any>) => 
  oauthMonitor.logOAuthInitiated(userId, metadata);

export const logOAuthSuccess = (userId: string, email: string, duration?: number) => 
  oauthMonitor.logOAuthSuccess(userId, email, duration);

export const logOAuthFailure = (
  errorType: string, 
  error: string, 
  userId?: string, 
  retryAttempt?: number,
  metadata?: Record<string, any>
) => oauthMonitor.logOAuthFailure(errorType, error, userId, retryAttempt, metadata);