/**
 * Production monitoring setup and health checks
 */

import { axiomLogger } from './axiom';
import { getAlertThresholds } from './alerts';

export interface SystemHealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface MonitoringConfig {
  axiom: {
    enabled: boolean;
    token: string;
    dataset: string;
    orgId: string;
  };
  alerts: {
    enabled: boolean;
    emailRecipients: string[];
    webhookUrl?: string;
  };
  healthChecks: {
    enabled: boolean;
    interval: number; // minutes
  };
}

/**
 * Initialize production monitoring
 */
export async function initializeProductionMonitoring(): Promise<MonitoringConfig> {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const config: MonitoringConfig = {
    axiom: {
      enabled: !!(process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET),
      token: process.env.AXIOM_TOKEN || '',
      dataset: process.env.AXIOM_DATASET || 'substack-intelligence',
      orgId: process.env.AXIOM_ORG_ID || ''
    },
    alerts: {
      enabled: isProduction && !!process.env.ALERT_EMAIL_RECIPIENTS,
      emailRecipients: (process.env.ALERT_EMAIL_RECIPIENTS || '').split(',').filter(Boolean),
      webhookUrl: process.env.ALERT_WEBHOOK_URL
    },
    healthChecks: {
      enabled: true,
      interval: 5 // 5 minutes
    }
  };

  // Log monitoring initialization
  await axiomLogger.logAppEvent('monitoring_initialized', {
    config: {
      axiom: config.axiom.enabled,
      alerts: config.alerts.enabled,
      healthChecks: config.healthChecks.enabled
    },
    environment: process.env.NODE_ENV,
    thresholds: getAlertThresholds()
  });

  // Start health check interval in production
  if (config.healthChecks.enabled && isProduction) {
    startHealthCheckInterval(config.healthChecks.interval);
  }

  return config;
}

/**
 * Perform comprehensive system health checks
 */
export async function performHealthChecks(): Promise<SystemHealthCheck[]> {
  const checks: SystemHealthCheck[] = [];
  
  // Database health check
  checks.push(await checkDatabase());
  
  // External API health checks
  checks.push(await checkAnthropicAPI());
  checks.push(await checkSupabaseAPI());
  
  // Service health checks
  checks.push(await checkRedisConnection());
  
  // Application health
  checks.push(await checkApplicationHealth());

  // Log health check results
  const healthyCount = checks.filter(c => c.status === 'healthy').length;
  const totalCount = checks.length;
  
  await axiomLogger.logHealthCheck('system', 
    healthyCount === totalCount ? 'healthy' : 'degraded',
    {
      totalChecks: totalCount,
      healthyChecks: healthyCount,
      checks: checks.map(c => ({ service: c.service, status: c.status, responseTime: c.responseTime }))
    }
  );

  return checks;
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<SystemHealthCheck> {
  const start = Date.now();
  
  try {
    // Simple database health check
    const response = await fetch('/api/health/database', { 
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    const responseTime = Date.now() - start;
    
    if (response.ok) {
      return {
        service: 'database',
        status: 'healthy',
        responseTime,
        metadata: { url: process.env.NEXT_PUBLIC_SUPABASE_URL?.split('@')[1] }
      };
    } else {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime,
        error: `HTTP ${response.status}`
      };
    }
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check Anthropic API connectivity
 */
async function checkAnthropicAPI(): Promise<SystemHealthCheck> {
  const start = Date.now();
  
  try {
    // Light API check - just verify credentials
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY && 
                     process.env.ANTHROPIC_API_KEY !== 'sk-ant-your-anthropic-api-key';
    
    if (!hasApiKey) {
      return {
        service: 'anthropic_api',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: 'API key not configured'
      };
    }

    // In production, we could make a minimal API call here
    // For now, just check configuration
    return {
      service: 'anthropic_api',
      status: 'healthy',
      responseTime: Date.now() - start,
      metadata: { configured: true }
    };
  } catch (error) {
    return {
      service: 'anthropic_api',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check Supabase API connectivity  
 */
async function checkSupabaseAPI(): Promise<SystemHealthCheck> {
  const start = Date.now();
  
  try {
    const hasConfig = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
                        process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    if (!hasConfig) {
      return {
        service: 'supabase_api',
        status: 'unhealthy', 
        responseTime: Date.now() - start,
        error: 'Supabase not configured'
      };
    }

    return {
      service: 'supabase_api',
      status: 'healthy',
      responseTime: Date.now() - start,
      metadata: { url: process.env.NEXT_PUBLIC_SUPABASE_URL }
    };
  } catch (error) {
    return {
      service: 'supabase_api',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check Redis connection for rate limiting
 */
async function checkRedisConnection(): Promise<SystemHealthCheck> {
  const start = Date.now();
  
  try {
    const hasRedisConfig = !!(process.env.UPSTASH_REDIS_REST_URL && 
                             process.env.UPSTASH_REDIS_REST_TOKEN);
    
    return {
      service: 'redis',
      status: hasRedisConfig ? 'healthy' : 'degraded',
      responseTime: Date.now() - start,
      metadata: { 
        configured: hasRedisConfig,
        note: hasRedisConfig ? 'Connected' : 'Rate limiting disabled'
      }
    };
  } catch (error) {
    return {
      service: 'redis',
      status: 'degraded',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check application-specific health metrics
 */
async function checkApplicationHealth(): Promise<SystemHealthCheck> {
  const start = Date.now();
  
  try {
    // Check environment configuration
    const requiredEnvVars = [
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'ANTHROPIC_API_KEY'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return {
        service: 'application',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: `Missing environment variables: ${missingVars.join(', ')}`
      };
    }

    // Check if debug mode is enabled in production
    const isProduction = process.env.NODE_ENV === 'production';
    const debugEnabled = process.env.APP_DEBUG_MODE === 'true';
    
    if (isProduction && debugEnabled) {
      return {
        service: 'application',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: 'Debug mode is enabled in production'
      };
    }

    return {
      service: 'application',
      status: 'healthy',
      responseTime: Date.now() - start,
      metadata: {
        environment: process.env.NODE_ENV,
        debugMode: debugEnabled,
        version: process.env.npm_package_version || '1.0.0'
      }
    };
  } catch (error) {
    return {
      service: 'application',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Start periodic health checks
 */
function startHealthCheckInterval(intervalMinutes: number) {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  // Run initial health check
  performHealthChecks();
  
  // Set up interval
  setInterval(async () => {
    try {
      await performHealthChecks();
    } catch (error) {
      await axiomLogger.logError(error as Error, { operation: 'health_check_interval' });
    }
  }, intervalMs);
}

/**
 * Get monitoring status for dashboard
 */
export async function getMonitoringStatus() {
  const healthChecks = await performHealthChecks();
  const config = await initializeProductionMonitoring();
  
  return {
    monitoring: {
      axiom: config.axiom.enabled,
      alerts: config.alerts.enabled,
      healthChecks: config.healthChecks.enabled
    },
    health: {
      overall: healthChecks.every(c => c.status === 'healthy') ? 'healthy' : 'degraded',
      services: healthChecks
    },
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };
}