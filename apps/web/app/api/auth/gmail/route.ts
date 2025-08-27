import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { currentUser } from '@clerk/nextjs/server';
import { validateOAuthConfig } from '@/lib/oauth-health-check';
import { logOAuthInitiated, logOAuthFailure } from '@/lib/oauth-monitoring';

// Environment variable validation
function validateEnvironment() {
  const errors = [];
  
  if (!process.env.GOOGLE_CLIENT_ID) {
    errors.push('GOOGLE_CLIENT_ID environment variable is not set');
  }
  
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    errors.push('GOOGLE_CLIENT_SECRET environment variable is not set');
  }
  
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    errors.push('NEXT_PUBLIC_APP_URL environment variable is not set');
  }
  
  return errors;
}

function createOAuth2Client() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const redirectUri = appUrl.startsWith('http') 
    ? `${appUrl}/api/auth/gmail/callback`
    : `https://${appUrl}/api/auth/gmail/callback`;
  
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

// GET - Initiate OAuth flow
export async function GET(request: NextRequest) {
  try {
    // Enhanced OAuth configuration validation
    const configValidation = await validateOAuthConfig();
    if (!configValidation.isValid) {
      return NextResponse.json({
        error: 'OAuth Configuration Error',
        details: configValidation.errors,
        warnings: configValidation.warnings,
        instructions: [
          'Set up OAuth 2.0 credentials in Google Cloud Console',
          'Add the required environment variables to your .env.local file',
          'Ensure NEXT_PUBLIC_APP_URL matches your current domain',
          'Check the OAuth health endpoint at /api/health/oauth for detailed diagnostics'
        ]
      }, { status: 500 });
    }

    const user = await currentUser();
    if (!user) {
      await logOAuthFailure('authentication_required', 'User not authenticated', undefined, undefined, {
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in to connect your Gmail account'
      }, { status: 401 });
    }

    // Log OAuth initiation
    await logOAuthInitiated(user.id, {
      userAgent: request.headers.get('user-agent') || 'unknown',
      referer: request.headers.get('referer') || 'unknown'
    });

    const oauth2Client = createOAuth2Client();
    
    // Generate OAuth URL with proper scopes
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: user.id, // Pass user ID in state for callback security
      prompt: 'consent', // Force consent to get refresh token
      include_granted_scopes: true
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const finalRedirectUri = appUrl.startsWith('http') 
      ? `${appUrl}/api/auth/gmail/callback`
      : `https://${appUrl}/api/auth/gmail/callback`;
      
    return NextResponse.json({ 
      authUrl,
      redirectUri: finalRedirectUri
    });
  } catch (error) {
    console.error('Gmail OAuth initiation failed:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('Gmail API')) {
        return NextResponse.json({
          error: 'Gmail API Not Enabled',
          message: 'The Gmail API is not enabled in your Google Cloud project',
          instructions: [
            'Go to Google Cloud Console',
            'Enable the Gmail API for your project',
            'Wait 2-3 minutes for the API to activate',
            'Try connecting again'
          ]
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      error: 'OAuth Setup Failed',
      message: 'Unable to initiate Gmail authentication. Please check your OAuth configuration.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Disconnect Gmail
export async function DELETE() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in to disconnect your Gmail account'
      }, { status: 401 });
    }

    // Disconnect Gmail in database
    const { UserSettingsService } = await import('@/lib/user-settings');
    const userSettingsService = new UserSettingsService();
    const success = await userSettingsService.disconnectGmail(user.id);
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Gmail account disconnected successfully',
        userId: user.id
      });
    } else {
      return NextResponse.json({
        error: 'Disconnection Failed',
        message: 'Unable to disconnect Gmail account. Please try again.',
        userId: user.id
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Gmail disconnection failed:', error);
    return NextResponse.json({
      error: 'Disconnection Error',
      message: 'An unexpected error occurred while disconnecting Gmail',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}