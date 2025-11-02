import { NextResponse } from 'next/server';
import { UserSettingsService } from '@/lib/user-settings';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

// GET - Check Gmail connection status
export async function GET() {
  try {
    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userSettingsService = new UserSettingsService();
    const settings = await userSettingsService.getUserSettings(session.user.id);
    
    if (!settings) {
      return NextResponse.json({
        connected: false,
        email: null
      });
    }

    return NextResponse.json({
      connected: settings.gmail_connected || false,
      email: settings.gmail_email || null
    });
    
  } catch (error) {
    console.error('Failed to get Gmail status:', error);
    return NextResponse.json(
      { error: 'Failed to get Gmail status' },
      { status: 500 }
    );
  }
}