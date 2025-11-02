import { NextRequest, NextResponse } from 'next/server';
import { UserSettingsService } from '@/lib/user-settings';
import { buildMissingUserIdColumnResponse, isMissingUserIdColumnError, MissingUserIdColumnError } from '@/lib/supabase-errors';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSecuritySession();

    if (!session) {
      return NextResponse.json({
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const { email } = await request.json();

    // Mark user as having Gmail connected using UserSettingsService
    const userSettingsService = new UserSettingsService();
    
    // Update settings to mark Gmail as connected via Supabase-managed OAuth
    const updated = await userSettingsService.createOrUpdateUserSettings(session.user.id, {
      gmail_connected: true,
      gmail_email: email
    });

    if (!updated) {
      console.error('Failed to mark Gmail as connected');
      return NextResponse.json({
        error: 'Failed to save connection status'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Gmail connection marked as active'
    });
  } catch (error) {
    console.error('Error marking Gmail as connected:', error);
    if (error instanceof MissingUserIdColumnError || isMissingUserIdColumnError(error)) {
      return buildMissingUserIdColumnResponse('gmail_mark_connected', error instanceof MissingUserIdColumnError ? error.table : 'user_settings');
    }
    return NextResponse.json({
      error: 'Failed to mark Gmail as connected'
    }, { status: 500 });
  }
}
