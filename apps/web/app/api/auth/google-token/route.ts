import { auth } from '@clerk/nextjs/server';
import { serverClerkClient } from '../../../../lib/clerk-client';
import { NextResponse } from 'next/server';

// This endpoint retrieves Google OAuth tokens from Clerk
// for the authenticated user to use with Gmail API

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's OAuth access tokens from Clerk
    const client = serverClerkClient;
    const oauthAccessTokens = await client.users.getUserOauthAccessToken(
      userId,
      'google'
    );

    if (oauthAccessTokens && oauthAccessTokens.data.length > 0) {
      const token = oauthAccessTokens.data[0];
      
      // Check if token has Gmail scopes
      const hasGmailScope = token.scopes?.some(scope => 
        scope.includes('gmail') || scope.includes('mail.google.com')
      );

      if (hasGmailScope) {
        // Store this token securely for Gmail API usage
        // In production, encrypt before storing
        
        return NextResponse.json({
          success: true,
          hasGmailAccess: true,
          email: token.externalAccountId,
          // Don't send the actual token to the client
          // Instead, store it server-side and use it for API calls
        });
      } else {
        return NextResponse.json({
          success: false,
          hasGmailAccess: false,
          message: 'Gmail permissions not granted. Please reconnect with Gmail access.',
        });
      }
    }

    return NextResponse.json({
      success: false,
      hasGmailAccess: false,
      message: 'No Google account connected',
    });
  } catch (error) {
    console.error('Failed to get Google OAuth token:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve OAuth token' },
      { status: 500 }
    );
  }
}