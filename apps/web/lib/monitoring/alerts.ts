/**
 * Alert configuration and thresholds for production monitoring
 */

export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  enabled: boolean;
}

export const PRODUCTION_ALERTS: AlertRule[] = [
  // Error Rate Alerts
  {
    name: 'high_error_rate',
    condition: 'error_rate > threshold',
    threshold: 5, // 5% error rate
    severity: 'critical',
    description: 'API error rate exceeds 5%',
    enabled: true
  },
  {
    name: 'authentication_failures',
    condition: 'auth_failures_per_minute > threshold',
    threshold: 10,
    severity: 'warning',
    description: 'High number of authentication failures',
    enabled: true
  },

  // Performance Alerts
  {
    name: 'slow_response_time',
    condition: 'avg_response_time > threshold',
    threshold: 2000, // 2 seconds
    severity: 'warning',
    description: 'Average API response time exceeds 2 seconds',
    enabled: true
  },
  {
    name: 'database_query_slow',
    condition: 'db_query_time > threshold',
    threshold: 5000, // 5 seconds
    severity: 'error',
    description: 'Database queries taking longer than 5 seconds',
    enabled: true
  },

  // Resource Alerts  
  {
    name: 'memory_usage_high',
    condition: 'memory_usage_percent > threshold',
    threshold: 85,
    severity: 'warning',
    description: 'Memory usage exceeds 85%',
    enabled: true
  },
  {
    name: 'rate_limit_breaches',
    condition: 'rate_limit_breaches_per_hour > threshold',
    threshold: 100,
    severity: 'info',
    description: 'High number of rate limit breaches',
    enabled: true
  },

  // Business Logic Alerts
  {
    name: 'ai_extraction_failures',
    condition: 'ai_extraction_failure_rate > threshold',
    threshold: 10, // 10% failure rate
    severity: 'error',
    description: 'AI extraction failure rate exceeds 10%',
    enabled: true
  },
  {
    name: 'email_processing_backlog',
    condition: 'email_processing_queue_size > threshold',
    threshold: 1000,
    severity: 'warning',
    description: 'Email processing queue backlog exceeds 1000',
    enabled: true
  },

  // Security Alerts
  {
    name: 'suspicious_activity',
    condition: 'security_events_per_minute > threshold',
    threshold: 20,
    severity: 'critical',
    description: 'High number of security events detected',
    enabled: true
  },
  {
    name: 'debug_mode_enabled',
    condition: 'debug_mode_enabled = true',
    threshold: 1,
    severity: 'critical',
    description: 'Debug mode is enabled in production',
    enabled: true
  }
];

export interface AlertThresholds {
  // Error thresholds
  errorRate: number;
  authFailuresPerMinute: number;
  
  // Performance thresholds  
  avgResponseTime: number;
  dbQueryTime: number;
  
  // Resource thresholds
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  
  // Business thresholds
  aiExtractionFailureRate: number;
  emailProcessingBacklog: number;
  
  // Security thresholds
  securityEventsPerMinute: number;
  rateLimitBreachesPerHour: number;
}

export const PRODUCTION_THRESHOLDS: AlertThresholds = {
  errorRate: 5,
  authFailuresPerMinute: 10,
  avgResponseTime: 2000,
  dbQueryTime: 5000,
  memoryUsagePercent: 85,
  cpuUsagePercent: 80,
  aiExtractionFailureRate: 10,
  emailProcessingBacklog: 1000,
  securityEventsPerMinute: 20,
  rateLimitBreachesPerHour: 100
};

export const STAGING_THRESHOLDS: AlertThresholds = {
  // More lenient thresholds for staging
  errorRate: 10,
  authFailuresPerMinute: 20,
  avgResponseTime: 5000,
  dbQueryTime: 10000,
  memoryUsagePercent: 90,
  cpuUsagePercent: 85,
  aiExtractionFailureRate: 20,
  emailProcessingBacklog: 2000,
  securityEventsPerMinute: 50,
  rateLimitBreachesPerHour: 200
};

export function getAlertThresholds(): AlertThresholds {
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.VERCEL_ENV === 'production';
  
  return isProduction ? PRODUCTION_THRESHOLDS : STAGING_THRESHOLDS;
}

/**
 * Alert notification channels
 */
export interface NotificationChannel {
  type: 'email' | 'webhook' | 'slack';
  config: Record<string, string>;
  enabled: boolean;
}

export const NOTIFICATION_CHANNELS: NotificationChannel[] = [
  {
    type: 'email',
    config: {
      recipients: process.env.ALERT_EMAIL_RECIPIENTS || 'admin@yourcompany.com'
    },
    enabled: !!process.env.RESEND_API_KEY
  },
  {
    type: 'webhook', 
    config: {
      url: process.env.ALERT_WEBHOOK_URL || ''
    },
    enabled: !!process.env.ALERT_WEBHOOK_URL
  }
];

/**
 * Check if an alert should be triggered based on current metrics
 */
export function shouldTriggerAlert(
  ruleName: string, 
  currentValue: number, 
  windowData?: number[]
): boolean {
  const rule = PRODUCTION_ALERTS.find(r => r.name === ruleName);
  if (!rule || !rule.enabled) return false;
  
  const thresholds = getAlertThresholds();
  const threshold = thresholds[ruleName as keyof AlertThresholds] || rule.threshold;
  
  switch (rule.condition) {
    case 'error_rate > threshold':
    case 'avg_response_time > threshold':
    case 'db_query_time > threshold':
    case 'memory_usage_percent > threshold':
    case 'ai_extraction_failure_rate > threshold':
    case 'auth_failures_per_minute > threshold':
    case 'security_events_per_minute > threshold':
    case 'rate_limit_breaches_per_hour > threshold':
    case 'email_processing_queue_size > threshold':
      return currentValue > threshold;
    
    case 'debug_mode_enabled = true':
      return currentValue === 1;
    
    default:
      return false;
  }
}

/**
 * Format alert message for notifications
 */
export function formatAlertMessage(
  ruleName: string,
  currentValue: number,
  threshold: number
): string {
  const rule = PRODUCTION_ALERTS.find(r => r.name === ruleName);
  const severity = rule?.severity.toUpperCase() || 'ALERT';
  const environment = process.env.NODE_ENV || 'unknown';
  
  return `🚨 ${severity} ALERT - ${environment.toUpperCase()}

${rule?.description || ruleName}

Current Value: ${currentValue}
Threshold: ${threshold}
Time: ${new Date().toISOString()}

Please investigate immediately.`;
}

/**
 * Get alert configuration for monitoring dashboard
 */
export function getAlertConfig() {
  return {
    rules: PRODUCTION_ALERTS,
    thresholds: getAlertThresholds(),
    channels: NOTIFICATION_CHANNELS.filter(c => c.enabled),
    environment: process.env.NODE_ENV || 'unknown'
  };
}