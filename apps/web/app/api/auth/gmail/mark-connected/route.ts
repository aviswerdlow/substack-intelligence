import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { UserSettingsService } from '@/lib/user-settings';
import { buildMissingUserIdColumnResponse, isMissingUserIdColumnError, MissingUserIdColumnError } from '@/lib/supabase-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    const { email } = await request.json();

    // Mark user as having Gmail connected using UserSettingsService
    const userSettingsService = new UserSettingsService();
    
    // Update settings to mark Gmail as connected via Clerk OAuth
    const updated = await userSettingsService.createOrUpdateUserSettings(user.id, {
      gmail_connected: true,
      gmail_email: email,
      // Store tokens as a JSON string to indicate Clerk OAuth
      gmail_refresh_token: JSON.stringify({
        useClerkOAuth: true,
        connectedAt: new Date().toISOString()
      })
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
