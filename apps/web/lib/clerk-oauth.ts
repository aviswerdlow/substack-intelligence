import { clerkClient } from '@clerk/nextjs/server';
import { google } from 'googleapis';

/**
 * Get Gmail OAuth tokens from Clerk for a user
 */
export async function getClerkGmailTokens(userId: string) {
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    
    // Find the Google OAuth account
    const googleAccount = user.externalAccounts?.find(
      account => account.provider === 'google' || account.provider === 'oauth_google'
    );
    
    if (!googleAccount) {
      throw new Error('No Google account connected through Clerk');
    }
    
    // Get the OAuth token from Clerk
    // Note: Clerk manages token refresh automatically
    const tokenResponse = await clerk.users.getUserOauthAccessToken(
      userId,
      'oauth_google'
    );
    
    if (!tokenResponse || tokenResponse.length === 0) {
      throw new Error('No OAuth tokens available from Clerk');
    }
    
    const token = tokenResponse[0];
    
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
  const tokens = await getClerkGmailTokens(userId);
  
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  auth.setCredentials({
    access_token: tokens.accessToken
  });
  
  return google.gmail({ version: 'v1', auth });
}