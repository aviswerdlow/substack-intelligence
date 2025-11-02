import { NextResponse } from 'next/server';
import { persistGmailTokens } from '@substack-intelligence/lib/gmail-tokens';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

// Mock OAuth endpoint for development/testing
export async function POST() {
  try {
    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock tokens and email for testing
    const mockEmail = session.user.email || 'test@example.com';
    const mockRefreshToken = 'mock_refresh_token_' + Date.now();
    const mockAccessToken = 'mock_access_token_' + Date.now();

    await persistGmailTokens(session.user.id, {
      refreshToken: mockRefreshToken,
      accessToken: mockAccessToken,
      email: mockEmail,
      expiresAt: new Date(Date.now() + 3600000),
      connected: true
    });

    return NextResponse.json({
      success: true,
      email: mockEmail,
      message: 'Gmail connected successfully (mock mode for development)'
    });
  } catch (error) {
    console.error('Mock Gmail connection failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to connect Gmail'
    }, { status: 500 });
  }
}