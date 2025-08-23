import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { UserSettingsService } from '@/lib/user-settings';

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
  );
}

function generateSuccessPage(emailAddress: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Gmail Connected Successfully</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 400px; 
            margin: 100px auto; 
            padding: 40px;
            text-align: center;
            background: #f9fafb;
          }
          .success-icon { color: #10b981; font-size: 48px; margin-bottom: 20px; }
          .email { color: #6b7280; font-size: 14px; margin: 10px 0; }
          .countdown { color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="success-icon">✓</div>
        <h2>Gmail Connected Successfully!</h2>
        <p class="email">Connected: ${emailAddress}</p>
        <p class="countdown">This window will close in <span id="countdown">3</span> seconds...</p>
        <script>
          localStorage.setItem('gmail_connected_email', '${emailAddress}');
          localStorage.setItem('gmail_connection_time', new Date().toISOString());
          
          let count = 3;
          const countdownElement = document.getElementById('countdown');
          const timer = setInterval(() => {
            count--;
            countdownElement.textContent = count;
            if (count <= 0) {
              clearInterval(timer);
              window.close();
            }
          }, 1000);
        </script>
      </body>
    </html>
  `;
}

function generateErrorPage(errorType: string, errorMessage: string, instructions: string[] = []) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Gmail Connection Failed</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 500px; 
            margin: 100px auto; 
            padding: 40px;
            text-align: center;
            background: #f9fafb;
          }
          .error-icon { color: #ef4444; font-size: 48px; margin-bottom: 20px; }
          .error-message { color: #6b7280; margin: 20px 0; }
          .instructions { 
            text-align: left; 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #ef4444;
          }
          .instructions ol { margin: 10px 0; padding-left: 20px; }
          .instructions li { margin: 5px 0; }
          .close-btn {
            background: #ef4444; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="error-icon">✗</div>
        <h2>Gmail Connection Failed</h2>
        <p class="error-message">${errorMessage}</p>
        ${instructions.length > 0 ? `
          <div class="instructions">
            <strong>How to fix this:</strong>
            <ol>
              ${instructions.map(instruction => `<li>${instruction}</li>`).join('')}
            </ol>
          </div>
        ` : ''}
        <button class="close-btn" onclick="window.close()">Close Window</button>
        <script>
          localStorage.setItem('gmail_connection_error', '${errorType}');
          localStorage.setItem('gmail_connection_error_time', new Date().toISOString());
        </script>
      </body>
    </html>
  `;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // User ID from state
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      const errorDescriptions: { [key: string]: { message: string; instructions: string[] } } = {
        'access_denied': {
          message: 'You denied access to your Gmail account. To connect Gmail, you need to grant the requested permissions.',
          instructions: [
            'Click the "Connect Gmail" button again',
            'Make sure to click "Allow" when Google asks for permissions',
            'Grant access to both "Read your email" and "Manage your email" permissions'
          ]
        },
        'invalid_client': {
          message: 'Invalid OAuth client configuration. This is a setup issue on our end.',
          instructions: [
            'Contact support with this error code',
            'This usually means the OAuth credentials are misconfigured',
            'The issue should be resolved by the development team'
          ]
        }
      };

      const errorInfo = errorDescriptions[error] || {
        message: `OAuth error: ${error}. Please try connecting again.`,
        instructions: ['Try connecting your Gmail account again', 'If the error persists, contact support']
      };

      return new NextResponse(generateErrorPage(error, errorInfo.message, errorInfo.instructions), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Validate required parameters
    if (!code) {
      return new NextResponse(generateErrorPage(
        'missing_code',
        'No authorization code received from Google. This usually indicates an incomplete OAuth flow.',
        [
          'Try connecting your Gmail account again',
          'Make sure you complete the entire Google authorization process',
          'Check that popups are not blocked in your browser'
        ]
      ), { headers: { 'Content-Type': 'text/html' } });
    }

    if (!state) {
      return new NextResponse(generateErrorPage(
        'missing_state',
        'Invalid callback - missing user identification. This is a security issue.',
        [
          'Try connecting your Gmail account again',
          'Make sure you are signed in to your account',
          'If the problem persists, try signing out and back in'
        ]
      ), { headers: { 'Content-Type': 'text/html' } });
    }

    const oauth2Client = createOAuth2Client();

    // Exchange code for tokens
    let tokens;
    try {
      const tokenResponse = await oauth2Client.getToken(code);
      tokens = tokenResponse.tokens;
    } catch (tokenError) {
      console.error('Token exchange failed:', tokenError);
      
      return new NextResponse(generateErrorPage(
        'token_exchange_failed',
        'Failed to exchange authorization code for access tokens. This could be a timing issue or invalid code.',
        [
          'Try connecting your Gmail account again',
          'Make sure you complete the authorization quickly (codes expire in 10 minutes)',
          'Check that your system clock is accurate'
        ]
      ), { headers: { 'Content-Type': 'text/html' } });
    }

    oauth2Client.setCredentials(tokens);

    // Get user's email address
    let emailAddress = '';
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      emailAddress = profile.data.emailAddress || '';
      
      if (!emailAddress) {
        throw new Error('Email address not found in Gmail profile');
      }
    } catch (profileError) {
      console.error('Failed to get Gmail profile:', profileError);
      
      return new NextResponse(generateErrorPage(
        'profile_fetch_failed',
        'Successfully authenticated but failed to retrieve your Gmail profile information.',
        [
          'Check that the Gmail API is enabled in your Google Cloud project',
          'Verify that your Google account has Gmail access',
          'Try disconnecting and reconnecting your Gmail account'
        ]
      ), { headers: { 'Content-Type': 'text/html' } });
    }

    // Store tokens in database
    if (!tokens.refresh_token || !tokens.access_token) {
      return new NextResponse(generateErrorPage(
        'missing_tokens',
        'Did not receive the required tokens from Google. This usually happens if you\'ve already connected this account before.',
        [
          'Try revoking app access in Google Account settings first',
          'Go to https://myaccount.google.com/permissions',
          'Remove this app and try connecting again'
        ]
      ), { headers: { 'Content-Type': 'text/html' } });
    }

    const userSettingsService = new UserSettingsService();
    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;
    
    const success = await userSettingsService.connectGmail(
      state, // userId from state
      tokens.refresh_token,
      tokens.access_token,
      emailAddress,
      expiryDate
    );
    
    if (!success) {
      return new NextResponse(generateErrorPage(
        'database_storage_failed',
        'Successfully authenticated with Gmail but failed to save the connection to our database.',
        [
          'This is a temporary issue on our end',
          'Try connecting your Gmail account again',
          'If the problem persists, contact support'
        ]
      ), { headers: { 'Content-Type': 'text/html' } });
    }

    // Return success page
    return new NextResponse(generateSuccessPage(emailAddress), {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Gmail OAuth callback failed:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Gmail API has not been used')) {
        return new NextResponse(generateErrorPage(
          'gmail_api_disabled',
          'The Gmail API is not enabled for this project.',
          [
            'Go to the Google Cloud Console',
            'Navigate to "APIs & Services" → "Library"',
            'Search for "Gmail API" and enable it',
            'Wait 2-3 minutes and try again'
          ]
        ), { headers: { 'Content-Type': 'text/html' } });
      }

      if (error.message.includes('invalid_grant')) {
        return new NextResponse(generateErrorPage(
          'invalid_grant',
          'The authorization grant is invalid, expired, or revoked.',
          [
            'Try connecting your Gmail account again',
            'Make sure your system clock is accurate',
            'If using a saved bookmark, get a fresh authorization link'
          ]
        ), { headers: { 'Content-Type': 'text/html' } });
      }
    }

    return new NextResponse(generateErrorPage(
      'unexpected_error',
      'An unexpected error occurred during Gmail connection.',
      [
        'Try connecting your Gmail account again',
        'Check your internet connection',
        'If the problem persists, contact support with the error details'
      ]
    ), { headers: { 'Content-Type': 'text/html' } });
  }
}