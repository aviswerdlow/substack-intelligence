import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { currentUser } from '@clerk/nextjs/server';

const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`;
console.log('OAuth Redirect URI:', redirectUri);
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

// GET - Initiate OAuth flow
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate OAuth URL
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: user.id, // Pass user ID in state for callback
      prompt: 'consent' // Force consent to get refresh token
    });

    console.log('Generated Auth URL:', authUrl);
    
    // Extract and log the redirect_uri parameter from the URL
    const urlParams = new URL(authUrl);
    console.log('Redirect URI in auth URL:', urlParams.searchParams.get('redirect_uri'));

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Gmail OAuth initiation failed:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Gmail authentication' },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect Gmail
export async function DELETE() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Disconnect Gmail in database
    const { UserSettingsService } = await import('@/lib/user-settings');
    const userSettingsService = new UserSettingsService();
    const success = await userSettingsService.disconnectGmail(user.id);
    
    if (success) {
      console.log('Gmail disconnected for user:', user.id);
      return NextResponse.json({ success: true, message: 'Gmail disconnected successfully' });
    } else {
      console.error('Failed to disconnect Gmail for user:', user.id);
      return NextResponse.json(
        { error: 'Failed to disconnect Gmail' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Gmail disconnection failed:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Gmail' },
      { status: 500 }
    );
  }
}