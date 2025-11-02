import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient, publishPost } from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PublishSchema = z.object({
  publishedAt: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const rateLimitResponse = await withRateLimit(request, `api/posts/${params.postId}/publish`);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json().catch(() => ({}));
    const parsed = PublishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid publish payload' }, { status: 400 });
    }

    const supabase = createServerComponentClient();
    const post = await publishPost(supabase, userId, params.postId, {
      publishedAt: parsed.data.publishedAt,
    });

    return NextResponse.json({ success: true, data: { post } });
  } catch (error) {
    console.error('Error publishing post:', error);
    return NextResponse.json({ success: false, error: 'Failed to publish post' }, { status: 500 });
  }
}
