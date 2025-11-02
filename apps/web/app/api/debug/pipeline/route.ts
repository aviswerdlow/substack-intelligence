import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/next-auth/session';
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
    const debugInfo: any = {
      user: {
        id: userId,
        email: user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || null,
        fullName: user?.fullName,
        hasSession: Boolean(user)
      },
      environment: {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        nodeEnv: process.env.NODE_ENV,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET
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

      try {
        const tokens = await userSettingsService.getGmailTokens(userId);
        if (tokens) {
          debugInfo.gmailOAuth = {
            success: true,
            hasRefreshToken: Boolean(tokens.refreshToken),
            hasAccessToken: Boolean(tokens.accessToken),
            email: tokens.email || settings?.gmail_email || null
          };
        } else {
          debugInfo.gmailOAuth = {
            success: false,
            error: 'No Gmail tokens stored for this user'
          };
        }
      } catch (error) {
        debugInfo.gmailOAuth = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } catch (error) {
      debugInfo.settingsError = error instanceof Error ? error.message : 'Unknown error';
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