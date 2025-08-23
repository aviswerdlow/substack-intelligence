import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { currentUser } from '@clerk/nextjs/server';
import { UserSettingsService } from '@/lib/user-settings';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in to test your Gmail connection'
      }, { status: 401 });
    }

    // Get user's Gmail tokens from database
    const userSettingsService = new UserSettingsService();
    const tokens = await userSettingsService.getGmailTokens(user.id);
    
    if (!tokens || !tokens.refreshToken) {
      return NextResponse.json({
        connected: false,
        error: 'No Gmail Connection',
        message: 'Gmail account is not connected to this account',
        instructions: [
          'Go to Settings → Email Integration',
          'Click "Connect Gmail"',
          'Complete the Google authorization process'
        ]
      });
    }

    // Test the connection by trying to get user profile
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
    );

    oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken,
      access_token: tokens.accessToken
    });

    try {
      // Try to refresh the token and get profile
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      const emailAddress = profile.data.emailAddress;
      const totalMessages = profile.data.messagesTotal || 0;
      const totalThreads = profile.data.threadsTotal || 0;

      // Test a simple query to ensure we can read emails
      const messages = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1,
        q: 'is:inbox'
      });

      return NextResponse.json({
        connected: true,
        email: emailAddress,
        stats: {
          totalMessages,
          totalThreads,
          canReadEmails: messages.data.messages ? messages.data.messages.length > 0 : true
        },
        permissions: [
          'Read Gmail emails',
          'Manage Gmail labels',
          'Access Gmail profile'
        ],
        lastTested: new Date().toISOString()
      });

    } catch (gmailError: any) {
      console.error('Gmail API test failed:', gmailError);

      // Handle specific Gmail API errors
      if (gmailError.code === 401) {
        return NextResponse.json({
          connected: false,
          error: 'Invalid Credentials',
          message: 'Gmail authentication has expired or been revoked',
          instructions: [
            'Disconnect your Gmail account in Settings',
            'Reconnect your Gmail account',
            'Make sure to grant all requested permissions'
          ]
        });
      }

      if (gmailError.message?.includes('Gmail API has not been used')) {
        return NextResponse.json({
          connected: false,
          error: 'Gmail API Not Enabled',
          message: 'The Gmail API is not enabled in the Google Cloud project',
          instructions: [
            'Go to Google Cloud Console',
            'Navigate to "APIs & Services" → "Library"',
            'Search for "Gmail API" and enable it',
            'Wait 2-3 minutes and try again'
          ]
        });
      }

      if (gmailError.code === 403) {
        return NextResponse.json({
          connected: false,
          error: 'Insufficient Permissions',
          message: 'The Gmail connection does not have the required permissions',
          instructions: [
            'Disconnect and reconnect your Gmail account',
            'Make sure to grant all requested permissions during authorization',
            'Check that your Google account has Gmail access'
          ]
        });
      }

      return NextResponse.json({
        connected: false,
        error: 'Connection Test Failed',
        message: `Gmail API error: ${gmailError.message || 'Unknown error'}`,
        details: {
          code: gmailError.code,
          status: gmailError.status
        }
      });
    }

  } catch (error) {
    console.error('Gmail test endpoint error:', error);
    return NextResponse.json({
      connected: false,
      error: 'Test Failed',
      message: 'Unable to test Gmail connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}