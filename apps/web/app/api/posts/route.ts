import { NextRequest, NextResponse } from 'next/server';
import {
  createServerComponentClient,
  getPosts,
  createPost,
  PostInput,
  PostListOptions,
  PostFilters,
} from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';
import {
  postCreationSchema,
  sanitizePostPayload,
  type PostCreationInput,
} from '@substack-intelligence/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GetPostsSchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'published_at', 'scheduled_for', 'title']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
  categories: z.string().optional(),
  publishedAfter: z.string().optional(),
  publishedBefore: z.string().optional(),
  scheduledAfter: z.string().optional(),
  scheduledBefore: z.string().optional(),
});

const CreatePostSchema = postCreationSchema;

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'api/posts');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const supabase = createServerComponentClient();
    const { searchParams } = new URL(request.url);
    const params = GetPostsSchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortDirection: searchParams.get('sortDirection') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      tags: searchParams.get('tags') ?? undefined,
      categories: searchParams.get('categories') ?? undefined,
      publishedAfter: searchParams.get('publishedAfter') ?? undefined,
      publishedBefore: searchParams.get('publishedBefore') ?? undefined,
      scheduledAfter: searchParams.get('scheduledAfter') ?? undefined,
      scheduledBefore: searchParams.get('scheduledBefore') ?? undefined,
    });

    if (!params.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: params.error.flatten(),
      }, { status: 400 });
    }

    const limit = params.data.limit ? parseInt(params.data.limit, 10) : 20;
    const offset = params.data.offset ? parseInt(params.data.offset, 10) : 0;

    const options: PostListOptions = {
      limit,
      offset,
      sortBy: params.data.sortBy,
      sortDirection: params.data.sortDirection,
      filters: {
        status: params.data.status ? (params.data.status as PostFilters['status']) : undefined,
        search: params.data.search ?? undefined,
        tags: params.data.tags
          ? params.data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
          : undefined,
        categories: params.data.categories
          ? params.data.categories.split(',').map(category => category.trim()).filter(Boolean)
          : undefined,
        publishedAfter: params.data.publishedAfter ?? undefined,
        publishedBefore: params.data.publishedBefore ?? undefined,
        scheduledAfter: params.data.scheduledAfter ?? undefined,
        scheduledBefore: params.data.scheduledBefore ?? undefined,
      },
    };

    const result = await getPosts(supabase, userId, options);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'api/posts');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const parsed = CreatePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid post data',
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    const sanitizedInput: PostCreationInput = sanitizePostPayload(parsed.data);

    const supabase = createServerComponentClient();
    const payload: PostInput = {
      title: sanitizedInput.title,
      slug: sanitizedInput.slug ?? undefined,
      excerpt: sanitizedInput.excerpt ?? undefined,
      content: sanitizedInput.content as PostInput['content'],
      status: sanitizedInput.status ?? undefined,
      subscriptionRequired: sanitizedInput.subscriptionRequired,
      allowComments: sanitizedInput.allowComments,
      seoTitle: sanitizedInput.seoTitle ?? undefined,
      seoDescription: sanitizedInput.seoDescription ?? undefined,
      seoKeywords: sanitizedInput.seoKeywords ?? undefined,
      categories: sanitizedInput.categories as PostInput['categories'],
      tags: sanitizedInput.tags as PostInput['tags'],
      mediaAssetIds: sanitizedInput.mediaAssetIds ?? undefined,
      featuredMediaId: sanitizedInput.featuredMediaId ?? undefined,
      publishedAt: sanitizedInput.publishedAt ?? undefined,
      scheduledFor: sanitizedInput.scheduledFor ?? undefined,
    };

    const post = await createPost(supabase, userId, payload);

    return NextResponse.json({
      success: true,
      data: { post },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ success: false, error: 'Failed to create post' }, { status: 500 });
  }
}
