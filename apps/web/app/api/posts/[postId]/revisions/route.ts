import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerComponentClient, listPostRevisions, getPostById } from '@substack-intelligence/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const post = await getPostById(supabase, userId, params.postId);
    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const revisions = await listPostRevisions(supabase, params.postId);

    return NextResponse.json({ success: true, data: { revisions } });
  } catch (error) {
    console.error('Error fetching post revisions:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch revisions' }, { status: 500 });
  }
}
