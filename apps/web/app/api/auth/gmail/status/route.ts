import { NextResponse } from 'next/server';
import { fetchGmailTokenState } from '@substack-intelligence/lib/gmail-tokens';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

// GET - Check Gmail connection status
export async function GET() {
  try {
    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const state = await fetchGmailTokenState(session.user.id);

    if (!state) {
      return NextResponse.json({
        connected: false,
        email: null
      });
    }

    return NextResponse.json({
      connected: Boolean(state.connected),
      email: state.email || null
    });
    
  } catch (error) {
    console.error('Failed to get Gmail status:', error);
    return NextResponse.json(
      { error: 'Failed to get Gmail status' },
      { status: 500 }
    );
  }
}