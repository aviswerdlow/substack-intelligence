import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerComponentClient, getPostAnalytics, PostFilters } from '@substack-intelligence/database';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AnalyticsQuerySchema = z.object({
  limit: z.string().optional(),
  status: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = AnalyticsQuerySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid analytics parameters' }, { status: 400 });
    }

    const limit = parsed.data.limit ? parseInt(parsed.data.limit, 10) : undefined;
    const status = parsed.data.status ? (parsed.data.status as PostFilters['status']) : undefined;

    const supabase = createServerComponentClient();
    const analytics = await getPostAnalytics(supabase, userId, {
      limit,
      status,
    });

    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error fetching post analytics:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
