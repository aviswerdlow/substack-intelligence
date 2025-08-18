import { axiomLogger } from './axiom';

// Alert configuration and thresholds
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    timeWindow: number; // minutes
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: ('console' | 'axiom')[];
  enabled: boolean;
}

// Default alert rules for the platform
export const defaultAlertRules: AlertRule[] = [
  {
    id: 'error_rate_spike',
    name: 'Error Rate Spike',
    description: 'Alert when error rate exceeds 5% over 5 minutes',
    condition: {
      metric: 'error_rate',
      operator: 'gt',
      threshold: 0.05, // 5%
      timeWindow: 5
    },
    severity: 'high',
    channels: ['console', 'axiom'],
    enabled: true
  },
  {
    id: 'critical_error_count',
    name: 'Critical Errors',
    description: 'Alert on any critical errors',
    condition: {
      metric: 'critical_error_count',
      operator: 'gt',
      threshold: 0,
      timeWindow: 1
    },
    severity: 'critical',
    channels: ['console', 'axiom'],
    enabled: true
  },
  {
    id: 'database_connection_errors',
    name: 'Database Connection Issues',
    description: 'Alert on database connection failures',
    condition: {
      metric: 'database_error_count',
      operator: 'gt',
      threshold: 3,
      timeWindow: 5
    },
    severity: 'critical',
    channels: ['console', 'axiom'],
    enabled: true
  },
  {
    id: 'gmail_api_failures',
    name: 'Gmail API Failures',
    description: 'Alert when Gmail API calls fail repeatedly',
    condition: {
      metric: 'gmail_api_error_count',
      operator: 'gt',
      threshold: 5,
      timeWindow: 10
    },
    severity: 'high',
    channels: ['console', 'axiom'],
    enabled: true
  },
  {
    id: 'claude_api_failures',
    name: 'Claude API Failures',
    description: 'Alert when Claude API calls fail repeatedly',
    condition: {
      metric: 'claude_api_error_count',
      operator: 'gt',
      threshold: 5,
      timeWindow: 10
    },
    severity: 'high',
    channels: ['console', 'axiom'],
    enabled: true
  },
  {
    id: 'slow_response_time',
    name: 'Slow API Response',
    description: 'Alert when API response time exceeds 5 seconds',
    condition: {
      metric: 'api_response_time',
      operator: 'gt',
      threshold: 5000, // 5 seconds
      timeWindow: 5
    },
    severity: 'medium',
    channels: ['console', 'axiom'],
    enabled: true
  },
  {
    id: 'high_memory_usage',
    name: 'High Memory Usage',
    description: 'Alert when memory usage exceeds 90%',
    condition: {
      metric: 'memory_usage_percent',
      operator: 'gt',
      threshold: 90,
      timeWindow: 5
    },
    severity: 'medium',
    channels: ['console', 'axiom'],
    enabled: true
  },
  {
    id: 'processing_queue_backlog',
    name: 'Processing Queue Backlog',
    description: 'Alert when processing queue has more than 100 pending jobs',
    condition: {
      metric: 'queue_pending_count',
      operator: 'gt',
      threshold: 100,
      timeWindow: 10
    },
    severity: 'medium',
    channels: ['console', 'axiom'],
    enabled: true
  }
];

export class AlertManager {
  private static instance: AlertManager;
  private rules: Map<string, AlertRule> = new Map();
  private alertCounts: Map<string, number> = new Map();
  private lastAlertTime: Map<string, number> = new Map();

  private constructor() {
    // Load default rules
    defaultAlertRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  async checkAlert(metric: string, value: number, context: Record<string, any> = {}): Promise<void> {
    const triggeredRules = this.findTriggeredRules(metric, value);
    
    for (const rule of triggeredRules) {
      await this.triggerAlert(rule, value, context);
    }
  }

  private findTriggeredRules(metric: string, value: number): AlertRule[] {
    return Array.from(this.rules.values()).filter(rule => {
      if (!rule.enabled || rule.condition.metric !== metric) {
        return false;
      }

      switch (rule.condition.operator) {
        case 'gt':
          return value > rule.condition.threshold;
        case 'gte':
          return value >= rule.condition.threshold;
        case 'lt':
          return value < rule.condition.threshold;
        case 'lte':
          return value <= rule.condition.threshold;
        case 'eq':
          return value === rule.condition.threshold;
        default:
          return false;
      }
    });
  }

  private async triggerAlert(rule: AlertRule, value: number, context: Record<string, any>): Promise<void> {
    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(rule.id) || 0;
    const timeSinceLastAlert = (now - lastAlert) / (1000 * 60); // minutes

    // Rate limiting: don't alert more than once per time window
    if (timeSinceLastAlert < rule.condition.timeWindow) {
      return;
    }

    this.lastAlertTime.set(rule.id, now);

    const alertData = {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      metric: rule.condition.metric,
      value,
      threshold: rule.condition.threshold,
      operator: rule.condition.operator,
      context,
      timestamp: new Date().toISOString()
    };

    // Send to configured channels
    if (rule.channels.includes('console')) {
      this.logToConsole(alertData);
    }

    if (rule.channels.includes('axiom')) {
      await this.logToAxiom(alertData);
    }
  }

  private logToConsole(alertData: any): void {
    const severity = alertData.severity.toUpperCase();
    const icon = this.getSeverityIcon(alertData.severity);
    
    console.warn(
      `${icon} ALERT [${severity}] ${alertData.ruleName}:`,
      `${alertData.metric} ${alertData.operator} ${alertData.threshold} (actual: ${alertData.value})`,
      alertData.context
    );
  }

  private async logToAxiom(alertData: any): Promise<void> {
    try {
      await axiomLogger.log('alerts', 'alert_triggered', alertData);
    } catch (error) {
      console.error('Failed to log alert to Axiom:', error);
    }
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🔥';
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return '💡';
      default: return '📢';
    }
  }

  // Utility methods for common alert patterns
  async checkErrorRate(errorCount: number, totalCount: number, context?: Record<string, any>): Promise<void> {
    if (totalCount === 0) return;
    const errorRate = errorCount / totalCount;
    await this.checkAlert('error_rate', errorRate, { errorCount, totalCount, ...context });
  }

  async checkResponseTime(responseTime: number, context?: Record<string, any>): Promise<void> {
    await this.checkAlert('api_response_time', responseTime, context);
  }

  async checkQueueSize(queueSize: number, context?: Record<string, any>): Promise<void> {
    await this.checkAlert('queue_pending_count', queueSize, context);
  }

  // Methods to manage rules
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.alertCounts.delete(ruleId);
    this.lastAlertTime.delete(ruleId);
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const existing = this.rules.get(ruleId);
    if (existing) {
      this.rules.set(ruleId, { ...existing, ...updates });
    }
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  getRuleById(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }
}

// Singleton instance
export const alertManager = AlertManager.getInstance();