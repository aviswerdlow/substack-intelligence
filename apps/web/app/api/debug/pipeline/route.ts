import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { UserSettingsService } from '@/lib/user-settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!user && !isDevelopment) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        debug: null
      }, { status: 401 });
    }
    
    const userId = user?.id || 'development-user';
    
    // Collect debug information
    const debugInfo = {
      user: {
        id: userId,
        email: user?.emailAddresses?.[0]?.emailAddress,
        externalAccounts: user?.externalAccounts?.map(account => ({
          provider: account.provider,
          email: account.emailAddress,
          id: account.id
        })),
        hasGoogleOAuth: user?.externalAccounts?.some(
          account => account.provider === 'google' || account.provider === 'oauth_google'
        )
      },
      environment: {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        nodeEnv: process.env.NODE_ENV,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    };
    
    // Try to get user settings
    try {
      const userSettingsService = new UserSettingsService();
      const settings = await userSettingsService.getUserSettings(userId);
      
      debugInfo.settings = {
        gmail_connected: settings?.gmail_connected,
        has_refresh_token: !!settings?.gmail_refresh_token,
        gmail_email: settings?.gmail_email
      };
      
      // Check if refresh token is JSON (Clerk OAuth)
      if (settings?.gmail_refresh_token) {
        try {
          const tokenData = JSON.parse(settings.gmail_refresh_token);
          debugInfo.settings.useClerkOAuth = tokenData.useClerkOAuth === true;
        } catch {
          debugInfo.settings.useClerkOAuth = false;
        }
      }
    } catch (error) {
      debugInfo.settingsError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // Try to test Clerk OAuth token fetch
    if (debugInfo.user.hasGoogleOAuth) {
      try {
        const { getClerkGmailTokens } = await import('@/lib/clerk-oauth');
        const tokens = await getClerkGmailTokens(userId);
        debugInfo.clerkOAuth = {
          success: true,
          hasAccessToken: !!tokens.accessToken,
          email: tokens.email
        };
      } catch (error) {
        debugInfo.clerkOAuth = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: null
    }, { status: 500 });
  }
}