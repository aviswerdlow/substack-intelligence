import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerComponentClient, schedulePost } from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ScheduleSchema = z.object({
  scheduledFor: z.string().min(1, 'Schedule time is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const rateLimitResponse = await withRateLimit(request, `api/posts/${params.postId}/schedule`);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid schedule payload',
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    const supabase = createServerComponentClient();
    const post = await schedulePost(supabase, userId, params.postId, {
      scheduledFor: parsed.data.scheduledFor,
    });

    return NextResponse.json({ success: true, data: { post } });
  } catch (error) {
    console.error('Error scheduling post:', error);
    return NextResponse.json({ success: false, error: 'Failed to schedule post' }, { status: 500 });
  }
}
