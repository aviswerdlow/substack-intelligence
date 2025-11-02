import { NextRequest, NextResponse } from 'next/server';
import { persistGmailTokens } from '@substack-intelligence/lib/gmail-tokens';
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

    await persistGmailTokens(session.user.id, {
      email: email ?? null,
      connected: true
    });

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
