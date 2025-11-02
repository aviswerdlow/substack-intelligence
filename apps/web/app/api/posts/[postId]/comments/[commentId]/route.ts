import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient, updateCommentStatus } from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UpdateStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'spam']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { postId: string; commentId: string } }
) {
  try {
    const rateLimitResponse = await withRateLimit(request, `api/posts/${params.postId}/comments/${params.commentId}`);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const parsed = UpdateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid status payload',
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    const supabase = createServerComponentClient();
    const comment = await updateCommentStatus(supabase, userId, params.commentId, parsed.data.status);

    return NextResponse.json({ success: true, data: { comment } });
  } catch (error) {
    console.error('Error updating comment status:', error);
    return NextResponse.json({ success: false, error: 'Failed to update comment' }, { status: 500 });
  }
}
