import { NextRequest, NextResponse } from 'next/server';
import { UserSettingsService } from '@/lib/user-settings';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

export async function GET() {
  try {
    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const settingsService = new UserSettingsService();
    const settings = await settingsService.getComprehensiveSettings(session.user.id);
    
    if (!settings) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch settings'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const settingsService = new UserSettingsService();

    const success = await settingsService.updateComprehensiveSettings(session.user.id, body);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to save settings'
      }, { status: 500 });
    }

    // Return updated settings
    const updatedSettings = await settingsService.getComprehensiveSettings(session.user.id);
    
    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}