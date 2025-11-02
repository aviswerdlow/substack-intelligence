import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  createServerComponentClient,
  listPostComments,
  addPostComment,
} from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  parentId: z.string().optional().nullable(),
  metadata: z.unknown().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerComponentClient();
    const comments = await listPostComments(supabase, userId, params.postId);

    return NextResponse.json({ success: true, data: { comments } });
  } catch (error) {
    console.error('Error fetching post comments:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const rateLimitResponse = await withRateLimit(request, `api/posts/${params.postId}/comments`);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid comment payload',
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    const supabase = createServerComponentClient();
    const comment = await addPostComment(supabase, userId, params.postId, {
      content: parsed.data.content,
      parentId: parsed.data.parentId ?? undefined,
      metadata: parsed.data.metadata ?? undefined,
    });

    return NextResponse.json({ success: true, data: { comment } }, { status: 201 });
  } catch (error) {
    console.error('Error creating post comment:', error);
    return NextResponse.json({ success: false, error: 'Failed to create comment' }, { status: 500 });
  }
}
