import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await currentUser();
    
    // Get environment variables (sanitized)
    const config = {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '***configured***' : 'missing',
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`,
      user: user ? { id: user.id, email: user.emailAddresses?.[0]?.emailAddress } : null,
      clerkAuth: user ? 'authenticated' : 'not authenticated',
      headers: {
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
      }
    };

    // Generate the OAuth URL for inspection
    const { google } = await import('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      state: user?.id || 'no-user',
      prompt: 'consent',
      include_granted_scopes: true
    });

    return NextResponse.json({
      debug: config,
      authUrl,
      expectedRedirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`,
      instructions: [
        '1. Check that NEXT_PUBLIC_APP_URL matches your deployment URL',
        '2. Verify the redirect URI in Google Console matches exactly',
        '3. Check if Clerk authentication is working',
        '4. Copy the authUrl and try opening it directly to see the exact error'
      ]
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}