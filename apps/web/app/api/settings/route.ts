import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { UserSettingsService } from '@/lib/user-settings';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const settingsService = new UserSettingsService();
    const settings = await settingsService.getComprehensiveSettings(userId);
    
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
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const settingsService = new UserSettingsService();
    
    const success = await settingsService.updateComprehensiveSettings(userId, body);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to save settings'
      }, { status: 500 });
    }

    // Return updated settings
    const updatedSettings = await settingsService.getComprehensiveSettings(userId);
    
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