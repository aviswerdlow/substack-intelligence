import { NextRequest, NextResponse } from 'next/server';
import {
  createServerComponentClient,
  getPostById,
  updatePost,
  deletePost,
  PostInput,
} from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const taxonomySchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional(),
  }),
]);

const ContentSchema = z.object({
  html: z.string().optional(),
  text: z.string().optional(),
  json: z.unknown().optional(),
});

const UpdatePostSchema = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  excerpt: z.string().max(500).optional().nullable(),
  content: ContentSchema.optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).optional(),
  subscriptionRequired: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoKeywords: z.array(z.string()).optional(),
  categories: z.array(taxonomySchema).optional(),
  tags: z.array(taxonomySchema).optional(),
  mediaAssetIds: z.array(z.string()).optional(),
  featuredMediaId: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
  scheduledFor: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const supabase = createServerComponentClient();
    const post = await getPostById(supabase, userId, params.postId);

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { post } });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const rateLimitResponse = await withRateLimit(request, `api/posts/${params.postId}`);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const parsed = UpdatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid post data',
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    const supabase = createServerComponentClient();
    const payload: Partial<PostInput> = {};

    if (parsed.data.title !== undefined) payload.title = parsed.data.title;
    if (parsed.data.slug !== undefined) payload.slug = parsed.data.slug;
    if (parsed.data.excerpt !== undefined) payload.excerpt = parsed.data.excerpt ?? undefined;
    if (parsed.data.content !== undefined) payload.content = parsed.data.content ?? undefined;
    if (parsed.data.status !== undefined) payload.status = parsed.data.status;
    if (parsed.data.subscriptionRequired !== undefined) payload.subscriptionRequired = parsed.data.subscriptionRequired;
    if (parsed.data.allowComments !== undefined) payload.allowComments = parsed.data.allowComments;
    if (parsed.data.seoTitle !== undefined) payload.seoTitle = parsed.data.seoTitle ?? undefined;
    if (parsed.data.seoDescription !== undefined) payload.seoDescription = parsed.data.seoDescription ?? undefined;
    if (parsed.data.seoKeywords !== undefined) payload.seoKeywords = parsed.data.seoKeywords;
    if (parsed.data.categories !== undefined) payload.categories = parsed.data.categories as PostInput['categories'];
    if (parsed.data.tags !== undefined) payload.tags = parsed.data.tags as PostInput['tags'];
    if (parsed.data.mediaAssetIds !== undefined) payload.mediaAssetIds = parsed.data.mediaAssetIds;
    if (parsed.data.featuredMediaId !== undefined) payload.featuredMediaId = parsed.data.featuredMediaId ?? undefined;
    if (parsed.data.publishedAt !== undefined) payload.publishedAt = parsed.data.publishedAt ?? undefined;
    if (parsed.data.scheduledFor !== undefined) payload.scheduledFor = parsed.data.scheduledFor ?? undefined;

    const supabasePost = await updatePost(supabase, userId, params.postId, payload);

    return NextResponse.json({ success: true, data: { post: supabasePost } });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ success: false, error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const rateLimitResponse = await withRateLimit(request, `api/posts/${params.postId}`);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const supabase = createServerComponentClient();
    await deletePost(supabase, userId, params.postId);

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete post' }, { status: 500 });
  }
}
