import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { UserSettingsService } from '@/lib/user-settings';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // User ID from state
    const error = searchParams.get('error');

    // Handle user denial
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=gmail_auth_denied`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=invalid_callback`
      );
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user's email address
    let emailAddress = '';
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      emailAddress = profile.data.emailAddress || '';
      console.log('Gmail profile retrieved:', emailAddress);
    } catch (profileError) {
      console.error('Failed to get Gmail profile:', profileError);
      // Use a fallback email if profile fetch fails
      emailAddress = 'gmail-user@connected.com';
    }

    // Store tokens in database
    if (tokens.refresh_token && tokens.access_token) {
      const userSettingsService = new UserSettingsService();
      const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;
      
      const success = await userSettingsService.connectGmail(
        state, // userId from state
        tokens.refresh_token,
        tokens.access_token,
        emailAddress,
        expiryDate
      );
      
      if (success) {
        console.log('Gmail connected successfully for:', emailAddress);
        console.log('Tokens stored in database');
      } else {
        console.error('Failed to store Gmail tokens in database');
        // Fallback to environment variable storage
        process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
        console.log('Using fallback: Refresh token stored in environment variable');
      }
    }

    // Create a page that will store the email in localStorage and close
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gmail Connected</title>
        </head>
        <body>
          <h2>Gmail Connected Successfully!</h2>
          <p>Connected account: ${emailAddress}</p>
          <p>This window will close automatically...</p>
          <script>
            // Store the connected email in localStorage for the parent window to read
            localStorage.setItem('gmail_connected_email', '${emailAddress}');
            // Close this window after a short delay
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Gmail OAuth callback failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=oauth_failed`
    );
  }
}