import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { UserSettingsService } from '@/lib/user-settings';

// Mock OAuth endpoint for development/testing
export async function POST() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In development, create a mock connection
    const userSettingsService = new UserSettingsService();
    
    // Mock tokens and email for testing
    const mockEmail = user.emailAddresses?.[0]?.emailAddress || 'test@example.com';
    const mockRefreshToken = 'mock_refresh_token_' + Date.now();
    const mockAccessToken = 'mock_access_token_' + Date.now();
    
    const success = await userSettingsService.connectGmail(
      user.id,
      mockRefreshToken,
      mockAccessToken,
      mockEmail,
      new Date(Date.now() + 3600000) // 1 hour from now
    );
    
    if (success) {
      return NextResponse.json({
        success: true,
        email: mockEmail,
        message: 'Gmail connected successfully (mock mode for development)'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to save connection'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Mock Gmail connection failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to connect Gmail'
    }, { status: 500 });
  }
}