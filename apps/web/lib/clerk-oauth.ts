import { clerkClient } from '@clerk/nextjs/server';
import { google } from 'googleapis';

/**
 * Get Gmail OAuth tokens from Clerk for a user
 */
export async function getClerkGmailTokens(userId: string) {
  console.log('[Clerk OAuth] Getting Gmail tokens for user:', userId);

  try {
    // Await clerkClient() to get the actual client instance
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    
    console.log('[Clerk OAuth] User external accounts:', user.externalAccounts?.map(a => ({
      provider: a.provider,
      email: a.emailAddress
    })));
    
    // Find the Google OAuth account
    const googleAccount = user.externalAccounts?.find(
      account => account.provider === 'google' || account.provider === 'oauth_google'
    );
    
    if (!googleAccount) {
      console.error('[Clerk OAuth] No Google account found in external accounts');
      throw new Error('No Google account connected through Clerk');
    }
    
    console.log('[Clerk OAuth] Found Google account:', googleAccount.emailAddress);
    
    // Get the OAuth token from Clerk
    // Note: Clerk manages token refresh automatically
    console.log('[Clerk OAuth] Fetching OAuth token from Clerk');
    const tokenResponse = await clerk.users.getUserOauthAccessToken(
      userId,
      'oauth_google'
    );
    
    console.log('[Clerk OAuth] Token response received:', {
      hasData: !!tokenResponse?.data,
      tokenCount: tokenResponse?.data?.length || 0
    });
    
    if (!tokenResponse || !tokenResponse.data || tokenResponse.data.length === 0) {
      console.error('[Clerk OAuth] No tokens in response');
      throw new Error('No OAuth tokens available from Clerk');
    }
    
    const token = tokenResponse.data[0];
    
    return {
      accessToken: token.token,
      // Clerk doesn't expose refresh tokens directly for security
      // It handles refresh automatically when you request a new token
      refreshToken: null,
      email: googleAccount.emailAddress
    };
  } catch (error) {
    console.error('Failed to get Clerk Gmail tokens:', error);
    throw error;
  }
}

/**
 * Create a Gmail client using Clerk OAuth tokens
 */
export async function createClerkGmailClient(userId: string) {
  console.log('[Clerk OAuth] Creating Gmail client for user:', userId);
  
  const tokens = await getClerkGmailTokens(userId);
  
  console.log('[Clerk OAuth] Got tokens, creating OAuth2 client');
  console.log('[Clerk OAuth] Environment check:', {
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
  });
  
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  console.log('[Clerk OAuth] Setting credentials with access token');
  auth.setCredentials({
    access_token: tokens.accessToken
  });
  
  console.log('[Clerk OAuth] Creating Gmail client');
  return google.gmail({ version: 'v1', auth });
}