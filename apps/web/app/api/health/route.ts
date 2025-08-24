import { NextResponse } from 'next/server';
import { createServiceRoleClientSafe } from '@substack-intelligence/database';
import { validateEnvironment, getEnvironmentHealth } from '@/lib/env-validation';
import { cachedDatabaseCheck, getHealthCacheHeaders } from '@/lib/health-cache';

export async function GET() {
  try {
    // Use cached database check to prevent overload
    const dbCheck = await cachedDatabaseCheck();
    const dbConnected = dbCheck.connected;
    const dbError = dbCheck.error;

    // Validate environment variables using centralized validation
    const envValidation = validateEnvironment();
    const envHealth = getEnvironmentHealth();

    // Determine overall status based on multiple factors
    let status: 'healthy' | 'degraded' | 'unhealthy';
    let statusCode: number;
    
    // Priority order for status determination:
    // 1. Database connection failure (when configured) = unhealthy
    // 2. Missing required env vars or invalid env vars = unhealthy
    // 3. Database not configured or missing optional vars = degraded
    // 4. Everything working = healthy
    
    if (!dbConnected && dbError && dbError !== 'Database client not configured') {
      // Database is configured but failing
      status = 'unhealthy';
      statusCode = 503;
    } else if (envHealth.status === 'unhealthy') {
      // Critical environment issues
      status = 'unhealthy';
      statusCode = 503;
    } else if (envHealth.status === 'degraded' || !dbConnected) {
      // Non-critical issues
      status = 'degraded';
      statusCode = 503;
    } else {
      // Everything is working
      status = 'healthy';
      statusCode = 200;
    }

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      database: {
        connected: dbConnected,
        latency: dbConnected ? 'ok' : 'error',
        ...(dbError && { error: dbError })
      },
      services: {
        supabase: dbConnected || (!!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        clerk: !!process.env.CLERK_SECRET_KEY && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        gmail: !!process.env.GOOGLE_CLIENT_ID,
        resend: !!process.env.RESEND_API_KEY
      },
      ...((envValidation.missingRequired.length > 0 || 
          envValidation.missingOptional.length > 0 || 
          envValidation.invalid.length > 0) && {
        warnings: {
          ...(envValidation.missingRequired.length > 0 && { 
            missingRequired: envValidation.missingRequired 
          }),
          ...(envValidation.missingOptional.length > 0 && { 
            missingOptional: envValidation.missingOptional 
          }),
          ...(envValidation.invalid.length > 0 && { 
            invalid: envValidation.invalid 
          }),
          message: envHealth.message
        }
      })
    }, { 
      status: statusCode,
      headers: getHealthCacheHeaders(status)
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 503,
      headers: getHealthCacheHeaders('unhealthy')
    });
  }
}