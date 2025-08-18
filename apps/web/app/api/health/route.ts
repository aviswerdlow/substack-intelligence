import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function GET() {
  try {
    // Check database connection
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('emails')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      throw error;
    }

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_KEY',
      'ANTHROPIC_API_KEY',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY'
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    const status = missingEnvVars.length === 0 ? 'healthy' : 'degraded';
    const statusCode = status === 'healthy' ? 200 : 503;

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      database: {
        connected: !error,
        latency: data ? 'ok' : 'error'
      },
      services: {
        supabase: !error,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        clerk: !!process.env.CLERK_SECRET_KEY,
        gmail: !!process.env.GOOGLE_CLIENT_ID,
        resend: !!process.env.RESEND_API_KEY
      },
      ...(missingEnvVars.length > 0 && {
        warnings: {
          missingEnvVars
        }
      })
    }, { status: statusCode });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}