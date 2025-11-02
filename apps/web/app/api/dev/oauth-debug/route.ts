import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuthHealthChecker } from '@/lib/oauth-health-check';
import { oauthMonitor } from '@/lib/oauth-monitoring';

// Development-only OAuth debugging endpoint
export async function GET() {
  // Only available in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ 
      error: 'Debug endpoint only available in development mode' 
    }, { status: 404 });
  }

  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      
      // Environment Variables Check
      environmentVariables: {
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? {
          set: true,
          valid: process.env.GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com'),
          preview: process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...'
        } : { set: false, valid: false, preview: null },
        
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? {
          set: true,
          length: process.env.GOOGLE_CLIENT_SECRET.length,
          preview: process.env.GOOGLE_CLIENT_SECRET.substring(0, 10) + '...'
        } : { set: false, length: 0, preview: null },
        
        NEXT_PUBLIC_APP_URL: {
          value: process.env.NEXT_PUBLIC_APP_URL,
          isLocalhost: process.env.NEXT_PUBLIC_APP_URL?.includes('localhost'),
          redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
        },
        
        // Optional monitoring variables
        AXIOM_TOKEN: process.env.AXIOM_TOKEN ? {
          set: true,
          preview: process.env.AXIOM_TOKEN.substring(0, 15) + '...'
        } : { set: false, preview: null },
        
        AXIOM_DATASET: {
          value: process.env.AXIOM_DATASET || null,
          set: !!process.env.AXIOM_DATASET
        }
      },

      // OAuth Client Test
      oauthClientTest: await testOAuthClient(),

      // Health Check
      healthCheck: await getHealthCheck(),

      // Recent Monitoring Data
      monitoring: getMonitoringData(),

      // Quick Setup Instructions
      setupInstructions: {
        steps: [
          '1. Go to https://console.cloud.google.com/',
          '2. Create a new project or select existing one',
          '3. Enable Gmail API in APIs & Services > Library',
          '4. Create OAuth 2.0 credentials in APIs & Services > Credentials',
          '5. Add authorized redirect URI: ' + process.env.NEXT_PUBLIC_APP_URL + '/api/auth/callback/google',
          '6. Copy Client ID and Client Secret to .env.local',
          '7. Test connection using this debug endpoint'
        ],
        requiredScopes: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify'
        ],
        commonIssues: [
          'Redirect URI mismatch - must match exactly',
          'Gmail API not enabled in Google Cloud Console',
          'OAuth consent screen not configured',
          'Client ID/Secret from wrong credential type (use Web Application)',
          'Environment variables not loaded (restart dev server after changes)'
        ]
      },

      // Debug Actions
      availableActions: {
        testConnection: '/api/dev/oauth-debug/test',
        forceHealthCheck: '/api/health/oauth',
        viewMonitoring: '/api/admin/oauth-monitoring',
        mockConnection: '/api/auth/gmail/mock'
      }
    };

    return NextResponse.json(debugInfo);

  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function testOAuthClient() {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return {
        status: 'failed',
        error: 'Missing required environment variables'
      };
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
    );

    // Test generating auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      prompt: 'consent'
    });

    return {
      status: 'success',
      authUrlGenerated: true,
      authUrlPreview: authUrl.substring(0, 100) + '...',
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`,
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ]
    };

  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function getHealthCheck() {
  try {
    const checker = OAuthHealthChecker.getInstance();
    return await checker.performHealthCheck();
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Health check failed'
    };
  }
}

function getMonitoringData() {
  try {
    const metrics = oauthMonitor.getMetrics();
    const recentEvents = oauthMonitor.getRecentEvents(10);
    const failureRate = oauthMonitor.getFailureRate(24);

    return {
      metrics: {
        totalAttempts: metrics.totalAttempts,
        successfulConnections: metrics.successfulConnections,
        failuresByType: metrics.failuresByType,
        successRate: metrics.totalAttempts > 0 
          ? ((metrics.successfulConnections / metrics.totalAttempts) * 100).toFixed(2) + '%'
          : '0%'
      },
      recentEvents: recentEvents.slice(0, 5).map(event => ({
        type: event.type,
        timestamp: event.timestamp,
        errorType: event.errorType,
        error: event.error ? event.error.substring(0, 100) + '...' : undefined
      })),
      failureRate: (failureRate * 100).toFixed(2) + '%',
      lastUpdated: metrics.lastUpdated
    };
  } catch (error) {
    return {
      error: 'Failed to get monitoring data',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}