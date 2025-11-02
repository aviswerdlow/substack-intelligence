import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

// Disable caching for health checks
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Validate Gmail OAuth environment variables
function validateGmailOAuthConfig(): { isValid: boolean; missingVars: string[] } {
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET', 
    'GOOGLE_REFRESH_TOKEN'
  ];
  
  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}

// GET - Check Gmail connection health
export async function GET() {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const session = await getServerSecuritySession();

    if (!session && !isDevelopment) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // First check environment configuration
    const oauthValidation = validateGmailOAuthConfig();
    if (!oauthValidation.isValid) {
      return NextResponse.json({
        success: false,
        healthy: false,
        error: 'Gmail OAuth configuration incomplete',
        details: {
          configurationIssues: true,
          missingEnvVars: oauthValidation.missingVars,
          setupInstructions: 'Please configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN environment variables'
        }
      });
    }

    // Test actual Gmail API connection
    try {
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!
      );
      
      auth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN!
      });
      
      const gmail = google.gmail({ version: 'v1', auth });
      const response = await gmail.users.getProfile({ userId: 'me' });
      
      if (response.data.emailAddress) {
        return NextResponse.json({
          success: true,
          healthy: true,
          details: {
            emailAddress: response.data.emailAddress,
            messagesTotal: response.data.messagesTotal || 0,
            threadsTotal: response.data.threadsTotal || 0,
            configurationComplete: true,
            lastChecked: new Date().toISOString()
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          healthy: false,
          error: 'Gmail API connection established but no email address returned',
          details: {
            configurationComplete: true,
            apiAccessible: true,
            dataRetrievalIssue: true
          }
        });
      }
    } catch (gmailError) {
      console.error('Gmail API connection test failed:', gmailError);
      
      return NextResponse.json({
        success: false,
        healthy: false,
        error: 'Gmail API connection failed',
        details: {
          configurationComplete: true,
          gmailApiError: gmailError instanceof Error ? gmailError.message : 'Unknown Gmail API error',
          possibleCauses: [
            'Invalid refresh token',
            'OAuth consent revoked', 
            'API quota exceeded',
            'Network connectivity issues'
          ]
        }
      });
    }
    
  } catch (error) {
    console.error('Gmail health check failed:', error);
    return NextResponse.json({
      success: false,
      healthy: false,
      error: 'Health check failed',
      details: {
        systemError: error instanceof Error ? error.message : 'Unknown system error'
      }
    }, { status: 500 });
  }
}