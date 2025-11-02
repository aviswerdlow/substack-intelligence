import { NextResponse } from 'next/server';
import { UserSettingsService } from '@/lib/user-settings';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

// This endpoint retrieves Google OAuth tokens stored in Supabase
// for the authenticated user to use with Gmail API

export async function GET() {
  try {
    const session = await getServerSecuritySession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userSettingsService = new UserSettingsService();
    const tokens = await userSettingsService.getGmailTokens(session.user.id);

    if (!tokens) {
      return NextResponse.json({
        success: false,
        hasGmailAccess: false,
        message: 'No Google account connected',
      });
    }

    const hasGmailAccess = Boolean(tokens.refreshToken || tokens.accessToken);

    if (!hasGmailAccess) {
      return NextResponse.json({
        success: false,
        hasGmailAccess: false,
        message: 'Gmail permissions not granted. Please reconnect with Gmail access.',
      });
    }

    return NextResponse.json({
      success: true,
      hasGmailAccess,
      email: tokens.email,
    });
  } catch (error) {
    console.error('Failed to get Google OAuth token:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve OAuth token' },
      { status: 500 }
    );
  }
}