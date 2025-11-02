import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEmailAnalytics } from '@substack-intelligence/lib/email/analytics';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

const querySchema = z.object({
  days: z.coerce.number().min(1).max(180).default(30),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!query.success) {
      return NextResponse.json({ success: false, error: 'Invalid query parameters' }, { status: 400 });
    }

    const analytics = await getEmailAnalytics(session.user.id, query.data.days);

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    console.error('[EmailAnalyticsAPI] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load analytics' }, { status: 500 });
  }
}
