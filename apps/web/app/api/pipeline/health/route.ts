import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

// Force Node.js runtime for full compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

interface HealthResponse {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: HealthCheckResult[];
  metadata: {
    version: string;
    environment: string;
    runtime: string;
  };
}

// GET endpoint for pipeline health check
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: HealthCheckResult[] = [];
  
  try {
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!user && !isDevelopment) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Check 1: HTML Parser Health
    const htmlParserResult = await checkHtmlParserHealth();
    checks.push(htmlParserResult);

    // Check 2: Gmail Connector Health
    const gmailConnectorResult = await checkGmailConnectorHealth();
    checks.push(gmailConnectorResult);

    // Check 3: Database Connectivity
    const databaseResult = await checkDatabaseHealth();
    checks.push(databaseResult);

    // Check 4: AI Extractor Health
    const aiExtractorResult = await checkAiExtractorHealth();
    checks.push(aiExtractorResult);

    // Check 5: Dependencies Health
    const dependenciesResult = checkDependenciesHealth();
    checks.push(dependenciesResult);

    // Determine overall health
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
    const hasDegraded = checks.some(check => check.status === 'degraded');
    
    const overall = hasUnhealthy ? 'unhealthy' : 
                   hasDegraded ? 'degraded' : 'healthy';

    const response: HealthResponse = {
      overall,
      timestamp: new Date().toISOString(),
      checks,
      metadata: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'unknown',
        runtime: 'nodejs'
      }
    };

    const statusCode = overall === 'unhealthy' ? 503 : 
                      overall === 'degraded' ? 200 : 200;

    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    console.error('Health check failed:', error);
    
    const response: HealthResponse = {
      overall: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: [
        {
          service: 'health-check',
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime: Date.now() - startTime
        }
      ],
      metadata: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'unknown',
        runtime: 'nodejs'
      }
    };

    return NextResponse.json(response, { status: 503 });
  }
}

/**
 * Check HTML parser health by parsing sample content
 */
async function checkHtmlParserHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const { parseNewsletterHTML } = await import('@substack-intelligence/ingestion/src/utils/html-parser');
    
    const testHtml = `
      <html>
        <head><title>Test</title></head>
        <body>
          <p>Sample newsletter content for health check</p>
          <script>alert('test');</script>
          <div class="unsubscribe">Unsubscribe</div>
        </body>
      </html>
    `;
    
    const result = await parseNewsletterHTML(testHtml);
    const responseTime = Date.now() - startTime;
    
    if (result.includes('Sample newsletter content') && !result.includes('alert')) {
      return {
        service: 'html-parser',
        status: 'healthy',
        responseTime,
        details: {
          textLength: result.length,
          scriptTagsRemoved: !result.includes('alert'),
          unsubscribeLinksRemoved: !result.includes('Unsubscribe')
        }
      };
    } else {
      return {
        service: 'html-parser',
        status: 'degraded',
        responseTime,
        error: 'HTML parsing not working correctly',
        details: {
          extractedText: result.substring(0, 100) + '...'
        }
      };
    }
  } catch (error) {
    return {
      service: 'html-parser',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check Gmail connector health
 */
async function checkGmailConnectorHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Check if we can import the Gmail connector (no jsdom errors)
    const { GmailConnector } = await import('@substack-intelligence/ingestion');
    
    // Create instance to test basic initialization
    const connector = new GmailConnector();
    
    // Test connection (but don't make actual API calls in health check)
    const responseTime = Date.now() - startTime;
    
    // Check if required environment variables are present
    const requiredEnvVars = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REFRESH_TOKEN'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      return {
        service: 'gmail-connector',
        status: 'degraded',
        responseTime,
        error: `Missing environment variables: ${missingEnvVars.join(', ')}`,
        details: {
          missingEnvVars,
          canImport: true
        }
      };
    }

    return {
      service: 'gmail-connector',
      status: 'healthy',
      responseTime,
      details: {
        canImport: true,
        canInitialize: true,
        environmentConfigured: true
      }
    };
  } catch (error) {
    return {
      service: 'gmail-connector',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        canImport: false
      }
    };
  }
}

/**
 * Check database connectivity
 */
async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const { createServiceRoleClient } = await import('@substack-intelligence/database');
    const supabase = createServiceRoleClient();
    
    // Simple health check query
    const { data, error } = await supabase
      .from('emails')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime,
        error: error.message,
        details: {
          operation: 'select',
          table: 'emails'
        }
      };
    }

    return {
      service: 'database',
      status: 'healthy',
      responseTime,
      details: {
        canConnect: true,
        canQuery: true,
        tablesAccessible: true
      }
    };
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check AI extractor health
 */
async function checkAiExtractorHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const { ClaudeExtractor } = await import('@substack-intelligence/ai');
    
    // Test initialization (don't make actual API calls)
    const extractor = new ClaudeExtractor();
    const responseTime = Date.now() - startTime;
    
    // Check if required API key is present
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
    
    if (!hasApiKey) {
      return {
        service: 'ai-extractor',
        status: 'degraded',
        responseTime,
        error: 'Missing ANTHROPIC_API_KEY environment variable',
        details: {
          canImport: true,
          canInitialize: true,
          apiKeyConfigured: false
        }
      };
    }

    return {
      service: 'ai-extractor',
      status: 'healthy',
      responseTime,
      details: {
        canImport: true,
        canInitialize: true,
        apiKeyConfigured: true
      }
    };
  } catch (error) {
    return {
      service: 'ai-extractor',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check critical dependencies
 */
function checkDependenciesHealth(): HealthCheckResult {
  const startTime = Date.now();
  
  try {
    const criticalDependencies = [
      'cheerio',
      'googleapis',
      'zod',
      'p-map'
    ];
    
    const missingDependencies = [];
    
    for (const dep of criticalDependencies) {
      try {
        require.resolve(dep);
      } catch {
        missingDependencies.push(dep);
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    if (missingDependencies.length > 0) {
      return {
        service: 'dependencies',
        status: 'unhealthy',
        responseTime,
        error: `Missing critical dependencies: ${missingDependencies.join(', ')}`,
        details: {
          missing: missingDependencies,
          checked: criticalDependencies
        }
      };
    }

    // Check for banned dependencies (like jsdom)
    const bannedDependencies = ['jsdom'];
    const foundBannedDeps = [];
    
    for (const dep of bannedDependencies) {
      try {
        require.resolve(dep);
        foundBannedDeps.push(dep);
      } catch {
        // Good - banned dependency not found
      }
    }
    
    if (foundBannedDeps.length > 0) {
      return {
        service: 'dependencies',
        status: 'degraded',
        responseTime,
        error: `Banned dependencies still present: ${foundBannedDeps.join(', ')}`,
        details: {
          bannedFound: foundBannedDeps,
          warning: 'These dependencies may cause serverless compatibility issues'
        }
      };
    }

    return {
      service: 'dependencies',
      status: 'healthy',
      responseTime,
      details: {
        allCriticalPresent: true,
        noBannedDependencies: true,
        checkedDependencies: criticalDependencies
      }
    };
  } catch (error) {
    return {
      service: 'dependencies',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}