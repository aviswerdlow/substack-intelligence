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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const taxonomySchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    slug: z.string().min(1).optional(),
    description: z.string().optional(),
  }),
]);

const ContentSchema = z.object({
  html: z.string().optional(),
  text: z.string().optional(),
  json: z.unknown().optional(),
});

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

const CreatePostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
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

    const supabase = createServerComponentClient();
    const payload: PostInput = {
      title: parsed.data.title,
      slug: parsed.data.slug ?? undefined,
      excerpt: parsed.data.excerpt ?? undefined,
      content: parsed.data.content ?? undefined,
      status: parsed.data.status ?? undefined,
      subscriptionRequired: parsed.data.subscriptionRequired,
      allowComments: parsed.data.allowComments,
      seoTitle: parsed.data.seoTitle ?? undefined,
      seoDescription: parsed.data.seoDescription ?? undefined,
      seoKeywords: parsed.data.seoKeywords ?? undefined,
      categories: parsed.data.categories as PostInput['categories'],
      tags: parsed.data.tags as PostInput['tags'],
      mediaAssetIds: parsed.data.mediaAssetIds ?? undefined,
      featuredMediaId: parsed.data.featuredMediaId ?? undefined,
      publishedAt: parsed.data.publishedAt ?? undefined,
      scheduledFor: parsed.data.scheduledFor ?? undefined,
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
