import { NextResponse } from 'next/server';
import { OAuthHealthChecker } from '@/lib/oauth-health-check';

// GET - OAuth Health Check
export async function GET() {
  try {
    const checker = OAuthHealthChecker.getInstance();
    const health = await checker.performHealthCheck();

    const httpStatus = health.status === 'error' ? 503 : 200;

    return NextResponse.json({
      ...health,
      endpoint: '/api/health/oauth',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0'
    }, { status: httpStatus });

  } catch (error) {
    console.error('OAuth health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Health check system failure',
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        environmentVariables: { status: 'fail', message: 'Health check system failure' },
        redirectUri: { status: 'fail', message: 'Health check system failure' },
        googleClientConfig: { status: 'fail', message: 'Health check system failure' },
        gmailApiAccess: { status: 'fail', message: 'Health check system failure' },
      },
      recommendations: [
        'Check application logs for detailed error information',
        'Verify that all required dependencies are installed',
        'Ensure the application has proper permissions'
      ],
      lastChecked: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST - Force Health Check Refresh
export async function POST() {
  try {
    const checker = OAuthHealthChecker.getInstance();
    const health = await checker.performHealthCheck();

    return NextResponse.json({
      message: 'Health check refreshed successfully',
      ...health,
      refreshed: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('OAuth health check refresh failed:', error);
    
    return NextResponse.json({
      error: 'Failed to refresh health check',
      message: error instanceof Error ? error.message : 'Unknown error',
      refreshed: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}