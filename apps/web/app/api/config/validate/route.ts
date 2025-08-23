import { NextRequest, NextResponse } from 'next/server';
import { withSecureRoute } from '@/lib/security/middleware';
import { Permission } from '@/lib/security/auth';
import { validateEnvironmentSecurity, performRuntimeSecurityChecks } from '@/lib/security/environment';
import { apiKeys } from '@/lib/config/secrets';
import { axiomLogger } from '@/lib/monitoring/axiom';
import validationCache from '@/lib/validation/cache';
import debouncer from '@/lib/validation/debounce';
import memoryMonitor from '@/lib/validation/memory-monitor';
import performanceTracker from '@/lib/validation/performance-metrics';

// Configuration validation endpoint for admins
export const GET = withSecureRoute(
  async (request: NextRequest, context) => {
    // Only admins can validate system configuration
    if (!context || !context.permissions.includes(Permission.ADMIN_SYSTEM)) {
      return new NextResponse(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check debouncing
    const debounceCheck = debouncer.shouldAllowRequest(context.userId);
    if (!debounceCheck.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: debounceCheck.reason,
          retryAfterMs: debounceCheck.waitMs
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((debounceCheck.waitMs || 1000) / 1000))
          } 
        }
      );
    }

    try {
      const { searchParams } = new URL(request.url);
      const checkType = searchParams.get('type') || 'full';
      const bypassCache = searchParams.get('force') === 'true';

      // Start performance tracking
      const endTracking = performanceTracker.startOperation(`validation_${checkType}`);

      let validationResult;

      // Try to get cached result first
      const cacheKey = `validation_${checkType}_${context.userId}`;
      
      validationResult = await validationCache.getOrFetch(
        cacheKey,
        async () => {
          switch (checkType) {
            case 'environment':
              return await validateEnvironmentConfiguration();
              
            case 'secrets':
              return await validateSecretsConfiguration();
              
            case 'runtime':
              return await validateRuntimeConfiguration();
              
            case 'full':
            default:
              return await validateFullConfiguration();
          }
        },
        { bypassCache }
      );

      const cached = !bypassCache && validationCache.has(cacheKey);
      endTracking(true, { cached });

      // Log validation request with performance metrics
      await axiomLogger.logSecurityEvent('configuration_validation', {
        checkType,
        userId: context.userId,
        result: validationResult.overall,
        issues: validationResult.issues?.length || 0,
        cached,
        performanceStats: performanceTracker.getStats(`validation_${checkType}`)
      });

      const statusCode = validationResult.overall === 'valid' ? 200 : 
                        validationResult.overall === 'warning' ? 206 : 400;

      return NextResponse.json({
        success: true,
        validation: validationResult,
        timestamp: new Date().toISOString(),
        cached,
        performance: {
          stats: performanceTracker.getStats(`validation_${checkType}`),
          cacheStats: validationCache.getStats()
        }
      }, { status: statusCode });

    } catch (error) {
      console.error('Configuration validation failed:', error);

      await axiomLogger.logError(error as Error, {
        operation: 'configuration_validation',
        userId: context?.userId
      });

      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Configuration validation failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
  {
    requireAuth: true,
    sensitiveEndpoint: true,
    allowedMethods: ['GET'],
    rateLimitEndpoint: 'api/config/validate'
  }
);

async function validateEnvironmentConfiguration() {
  const envSecurity = validateEnvironmentSecurity();
  const runtimeChecks = performRuntimeSecurityChecks();

  const issues = [...envSecurity.errors, ...envSecurity.warnings];
  const runtimeIssues = runtimeChecks.checks
    .filter(check => !check.passed)
    .map(check => check.message);

  return {
    overall: envSecurity.isSecure && runtimeChecks.passed ? 'valid' : 
             envSecurity.errors.length === 0 ? 'warning' : 'invalid',
    category: 'environment',
    checks: {
      environmentSecurity: {
        passed: envSecurity.isSecure,
        errors: envSecurity.errors,
        warnings: envSecurity.warnings
      },
      runtimeSecurity: {
        passed: runtimeChecks.passed,
        checks: runtimeChecks.checks
      }
    },
    issues: [...issues, ...runtimeIssues],
    recommendations: generateEnvironmentRecommendations(envSecurity, runtimeChecks)
  };
}

async function validateSecretsConfiguration() {
  const apiKeyValidation = apiKeys.validateAllKeys();
  
  // Check for required secrets
  const requiredSecrets = [
    'ENCRYPTION_KEY',
    'CRON_SECRET'
  ];

  const missingSecrets = requiredSecrets.filter(secret => !process.env[secret]);
  const weakSecrets = [];

  // Check secret strength
  for (const secret of requiredSecrets) {
    const value = process.env[secret];
    if (value && value.length < 16) {
      weakSecrets.push(`${secret} is too short`);
    }
  }

  const allValid = apiKeyValidation.valid && 
                  missingSecrets.length === 0 && 
                  weakSecrets.length === 0;

  const issues = [
    ...apiKeyValidation.results.filter(r => !r.valid).map(r => r.issue || `${r.service} key invalid`),
    ...missingSecrets.map(s => `Missing required secret: ${s}`),
    ...weakSecrets
  ];

  return {
    overall: allValid ? 'valid' : 'invalid',
    category: 'secrets',
    checks: {
      apiKeys: apiKeyValidation,
      requiredSecrets: {
        missing: missingSecrets,
        weak: weakSecrets
      }
    },
    issues,
    recommendations: generateSecretsRecommendations(issues)
  };
}

async function validateRuntimeConfiguration() {
  const checks = [
    {
      name: 'Memory Usage',
      check: () => {
        // Get memory status from background monitor instead of checking inline
        const memStatus = memoryMonitor.getStatus();
        const trend = memStatus.trend;
        
        let message = `Heap usage: ${memStatus.heapUsedMB}MB (${memStatus.heapPercentage}% of total)`;
        if (trend) {
          message += `, trend: ${trend.increasing ? '↑' : '↓'} ${Math.abs(trend.changeRate)}MB/interval`;
        }
        
        return {
          passed: memStatus.status !== 'critical',
          message,
          value: {
            heapUsedMB: memStatus.heapUsedMB,
            heapPercentage: memStatus.heapPercentage,
            status: memStatus.status,
            trend,
            history: memoryMonitor.getReadings().slice(-5).map(r => ({
              timestamp: r.timestamp,
              heapUsedMB: Math.round(r.heapUsedMB * 100) / 100
            }))
          }
        };
      }
    },
    {
      name: 'Node.js Version',
      check: () => {
        const version = process.version;
        const majorVersion = parseInt(version.slice(1).split('.')[0]);
        return {
          passed: majorVersion >= 18,
          message: `Node.js version: ${version}`,
          value: majorVersion
        };
      }
    },
    {
      name: 'Environment Isolation',
      check: () => {
        const isProduction = process.env.NODE_ENV === 'production';
        const hasDebug = process.env.DEBUG === 'true';
        const passed = !isProduction || !hasDebug;
        return {
          passed,
          message: passed ? 'Environment properly isolated' : 'Debug mode enabled in production',
          value: { isProduction, hasDebug }
        };
      }
    },
    {
      name: 'Security Headers Support',
      check: () => {
        const hasHeaders = typeof Headers !== 'undefined';
        return {
          passed: hasHeaders,
          message: hasHeaders ? 'Headers API available' : 'Headers API not available',
          value: hasHeaders
        };
      }
    }
  ];

  const results = checks.map(({ name, check }) => {
    try {
      const result = check();
      return { name, ...result };
    } catch (error) {
      return {
        name,
        passed: false,
        message: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        value: null
      };
    }
  });

  const allPassed = results.every(r => r.passed);
  const issues = results.filter(r => !r.passed).map(r => `${r.name}: ${r.message}`);

  return {
    overall: allPassed ? 'valid' : 'warning',
    category: 'runtime',
    checks: {
      runtime: results
    },
    issues,
    recommendations: generateRuntimeRecommendations(results)
  };
}

async function validateFullConfiguration() {
  const [envResult, secretsResult, runtimeResult] = await Promise.all([
    validateEnvironmentConfiguration(),
    validateSecretsConfiguration(),
    validateRuntimeConfiguration()
  ]);

  const allResults = [envResult, secretsResult, runtimeResult];
  
  // Determine overall status
  const hasInvalid = allResults.some(r => r.overall === 'invalid');
  const hasWarnings = allResults.some(r => r.overall === 'warning');
  
  let overall: 'valid' | 'warning' | 'invalid';
  if (hasInvalid) {
    overall = 'invalid';
  } else if (hasWarnings) {
    overall = 'warning';
  } else {
    overall = 'valid';
  }

  const allIssues = allResults.flatMap(r => r.issues || []);
  const allRecommendations = allResults.flatMap(r => r.recommendations || []);

  return {
    overall,
    category: 'full',
    checks: {
      environment: envResult.checks,
      secrets: secretsResult.checks,
      runtime: runtimeResult.checks
    },
    issues: allIssues,
    recommendations: allRecommendations,
    summary: {
      totalChecks: allResults.length,
      passed: allResults.filter(r => r.overall === 'valid').length,
      warnings: allResults.filter(r => r.overall === 'warning').length,
      failed: allResults.filter(r => r.overall === 'invalid').length
    }
  };
}

function generateEnvironmentRecommendations(envSecurity: any, runtimeChecks: any): string[] {
  const recommendations = [];

  if (envSecurity.errors.length > 0) {
    recommendations.push('Fix critical environment security issues before production deployment');
  }

  if (!runtimeChecks.passed) {
    recommendations.push('Address runtime security check failures');
    runtimeChecks.checks
      .filter(check => !check.passed)
      .forEach(check => recommendations.push(`Runtime: ${check.message}`));
  }

  if (envSecurity.warnings.length > 0) {
    recommendations.push('Review and address environment security warnings');
  }

  return recommendations;
}

function generateSecretsRecommendations(issues: string[]): string[] {
  const recommendations = [];

  if (issues.some(issue => issue.includes('Missing'))) {
    recommendations.push('Configure all required secrets before deployment');
  }

  if (issues.some(issue => issue.includes('too short'))) {
    recommendations.push('Generate stronger secrets with sufficient entropy');
  }

  if (issues.some(issue => issue.includes('key'))) {
    recommendations.push('Verify all API keys are valid and have correct permissions');
  }

  recommendations.push('Rotate secrets regularly and use unique values per environment');

  return recommendations;
}

function generateRuntimeRecommendations(results: any[]): string[] {
  const recommendations = [];

  const memoryResult = results.find(r => r.name === 'Memory Usage');
  if (memoryResult && !memoryResult.passed) {
    recommendations.push('Monitor memory usage and optimize application performance');
  }

  const nodeResult = results.find(r => r.name === 'Node.js Version');
  if (nodeResult && !nodeResult.passed) {
    recommendations.push('Upgrade to Node.js 18 or later for security and performance benefits');
  }

  const envResult = results.find(r => r.name === 'Environment Isolation');
  if (envResult && !envResult.passed) {
    recommendations.push('Disable debug mode in production environments');
  }

  return recommendations;
}