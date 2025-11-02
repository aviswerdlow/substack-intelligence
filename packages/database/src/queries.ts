// Conditional cache import - use identity function in test/non-React environments
let cache: <T extends (...args: any[]) => any>(fn: T) => T;
try {
  // Try to import React cache
  const react = require('react');
  cache = react.cache;
  // Fallback if cache doesn't exist (older React versions or test environment)
  if (!cache || typeof cache !== 'function') {
    cache = <T extends (...args: any[]) => any>(fn: T): T => fn;
  }
} catch {
  // Fallback for non-React environments or tests
  cache = <T extends (...args: any[]) => any>(fn: T): T => fn;
}

import type { Database, Json } from './types/supabase';
import type { SupabaseClient } from './client';

type Tables = Database['public']['Tables'];
type Email = Tables['emails']['Row'];
type Company = Tables['companies']['Row'];
type CompanyMention = Tables['company_mentions']['Row'];
type UserTodo = Tables['user_todos']['Row'];
type DailyIntelligence = Database['public']['Views']['daily_intelligence']['Row'];
type Post = Tables['posts']['Row'];
type ContentCategory = Tables['content_categories']['Row'];
type ContentTag = Tables['content_tags']['Row'];
type MediaAsset = Tables['media_assets']['Row'];
type PostRevision = Tables['post_revisions']['Row'];
type PostComment = Tables['post_comments']['Row'];
type PostAnalyticsRow = Database['public']['Views']['post_analytics_view']['Row'];

export type HydratedPost = Post & {
  categories: ContentCategory[];
  tags: ContentTag[];
  mediaAssets: MediaAsset[];
};

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
};

const uniqueStrings = (values?: (string | null | undefined)[]) => {
  return Array.from(new Set((values || []).filter((v): v is string => typeof v === 'string' && v.trim().length > 0))).map(v => v.trim());
};

const getContentText = (content: any): string => {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content === 'object') {
    if (typeof content.text === 'string') return content.text;
    if (typeof content.html === 'string') {
      return content.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  return '';
};

const calculateReadingTime = (content: any) => {
  const text = getContentText(content);
  if (!text) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

type TaxonomyInput =
  | string
  | {
      name: string;
      slug?: string;
      description?: string | null;
    };

const normalizeTaxonomyInput = (value: TaxonomyInput): { name: string; slug: string; description?: string | null } => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return { name: trimmed, slug: slugify(trimmed) };
  }
  const name = value.name.trim();
  return {
    name,
    slug: slugify(value.slug || name),
    description: value.description,
  };
};

const upsertTaxonomy = async (
  supabase: SupabaseClient,
  table: 'content_tags' | 'content_categories',
  userId: string,
  items?: TaxonomyInput[]
) => {
  if (!items || items.length === 0) return [] as (ContentTag | ContentCategory)[];

  const normalized = items.map(normalizeTaxonomyInput);
  const { data: existing } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .in('slug', normalized.map(item => item.slug));

  const existingMap = new Map((existing || []).map(item => [item.slug, item]));
  const toInsert = normalized.filter(item => !existingMap.has(item.slug));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from(table).insert(
      toInsert.map(item => ({
        user_id: userId,
        name: item.name,
        slug: item.slug,
        description: item.description || null,
      }))
    );
    if (insertError) throw insertError;
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .in('slug', normalized.map(item => item.slug));

  if (refreshError) throw refreshError;
  return refreshed || [];
};

const hydratePosts = async (
  supabase: SupabaseClient,
  userId: string,
  posts: Post[]
): Promise<HydratedPost[]> => {
  if (posts.length === 0) return [];

  const categorySlugs = uniqueStrings(posts.flatMap(post => post.category_slugs || []));
  const tagSlugs = uniqueStrings(posts.flatMap(post => post.tag_slugs || []));
  const mediaIds = uniqueStrings(posts.flatMap(post => post.media_asset_ids || []));

  const [categoriesResult, tagsResult, mediaResult] = await Promise.all([
    categorySlugs.length
      ? supabase
          .from('content_categories')
          .select('*')
          .eq('user_id', userId)
          .in('slug', categorySlugs)
      : Promise.resolve({ data: [] as ContentCategory[] }),
    tagSlugs.length
      ? supabase
          .from('content_tags')
          .select('*')
          .eq('user_id', userId)
          .in('slug', tagSlugs)
      : Promise.resolve({ data: [] as ContentTag[] }),
    mediaIds.length
      ? supabase
          .from('media_assets')
          .select('*')
          .in('id', mediaIds)
          .eq('user_id', userId)
      : Promise.resolve({ data: [] as MediaAsset[] }),
  ]);

  const categoriesMap = new Map((categoriesResult.data || []).map(category => [category.slug, category]));
  const tagsMap = new Map((tagsResult.data || []).map(tag => [tag.slug, tag]));
  const mediaMap = new Map((mediaResult.data || []).map(asset => [asset.id, asset]));

  return posts.map(post => ({
    ...post,
    categories: (post.category_slugs || []).map(slug => categoriesMap.get(slug)).filter(Boolean) as ContentCategory[],
    tags: (post.tag_slugs || []).map(slug => tagsMap.get(slug)).filter(Boolean) as ContentTag[],
    mediaAssets: (post.media_asset_ids || []).map(id => mediaMap.get(id)).filter(Boolean) as MediaAsset[],
  }));
};

const assertPostOwnership = async (
  supabase: SupabaseClient,
  userId: string,
  postId: string
) => {
  const { data, error } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Post not found');
  }
};

const snapshotRevision = async (
  supabase: SupabaseClient,
  post: Post,
  editorId: string,
  summary?: string
) => {
  await supabase.from('post_revisions').insert({
    post_id: post.id,
    editor_id: editorId,
    title: post.title,
    excerpt: post.excerpt || null,
    content: post.content as Json,
    summary: summary || null,
  });
};

const updateDailyMetrics = async (
  supabase: SupabaseClient,
  postId: string,
  date: string,
  deltas: { views?: number; uniqueViews?: number; comments?: number }
) => {
  const { data: existing } = await supabase
    .from('post_metrics_daily')
    .select('*')
    .eq('post_id', postId)
    .eq('metric_date', date)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await supabase.from('post_metrics_daily').insert({
      post_id: postId,
      metric_date: date,
      views: deltas.views || 0,
      unique_views: deltas.uniqueViews || 0,
      comments: deltas.comments || 0,
    });
    if (insertError) throw insertError;
    return;
  }

  const { error: updateError } = await supabase
    .from('post_metrics_daily')
    .update({
      views: (existing.views || 0) + (deltas.views || 0),
      unique_views: (existing.unique_views || 0) + (deltas.uniqueViews || 0),
      comments: (existing.comments || 0) + (deltas.comments || 0),
    })
    .eq('post_id', postId)
    .eq('metric_date', date);

  if (updateError) throw updateError;
};

// Cached queries for React Server Components
export const getCompanyById = cache(async (supabase: SupabaseClient, id: string, userId?: string) => {
  let query = supabase
    .from('companies')
    .select(`
      *,
      mentions:company_mentions(
        *,
        email:emails(
          newsletter_name,
          received_at,
          subject
        )
      )
    `)
    .eq('id', id);
  
  // Filter by user_id if provided
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query.single();

  if (error) throw error;
  return data;
});

export const getCompanies = cache(async (
  supabase: SupabaseClient,
  options: {
    limit?: number;
    offset?: number;
    search?: string;
    fundingStatus?: string;
    orderBy?: 'mention_count' | 'created_at' | 'name';
    orderDirection?: 'asc' | 'desc';
    userId?: string;
  } = {}
) => {
  const {
    limit = 20,
    offset = 0,
    search,
    fundingStatus,
    orderBy = 'mention_count',
    orderDirection = 'desc',
    userId
  } = options;

  let query = supabase
    .from('companies')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order(orderBy, { ascending: orderDirection === 'asc' });
  
  // Filter by user_id if provided
  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (fundingStatus && fundingStatus !== 'all') {
    query = query.eq('funding_status', fundingStatus);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    companies: data,
    total: count || 0,
    hasMore: (offset + limit) < (count || 0)
  };
});

export const getDailyIntelligence = cache(async (
  supabase: SupabaseClient,
  options: {
    limit?: number;
    days?: number;
  } = {}
) => {
  const { limit = 50, days = 1 } = options;

  const { data, error } = await supabase
    .from('daily_intelligence')
    .select('*')
    .gte('received_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('mention_count', { ascending: false })
    .order('confidence', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
});

export const getEmailById = cache(async (supabase: SupabaseClient, id: string) => {
  const { data, error } = await supabase
    .from('emails')
    .select(`
      *,
      mentions:company_mentions(
        *,
        company:companies(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
});

export const getRecentEmails = cache(async (
  supabase: SupabaseClient,
  options: {
    limit?: number;
    newsletterName?: string;
    status?: string;
    userId?: string;
  } = {}
) => {
  const { limit = 20, newsletterName, status, userId } = options;

  let query = supabase
    .from('emails')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(limit);
  
  // Filter by user_id if provided
  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (newsletterName) {
    query = query.eq('newsletter_name', newsletterName);
  }

  if (status) {
    query = query.eq('processing_status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
});

export const getTopNewsletters = cache(async (supabase: SupabaseClient) => {
  // Supabase JS client doesn't support GROUP BY directly, so we'll fetch and group in JS
  const { data: emails, error } = await supabase
    .from('emails')
    .select('newsletter_name')
    .gte('received_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(100);

  if (error) throw error;
  
  // Manual grouping in JavaScript
  const grouped = emails?.reduce((acc: any, email: any) => {
    acc[email.newsletter_name] = (acc[email.newsletter_name] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(grouped || {})
    .map(([newsletter_name, count]) => ({ newsletter_name, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);
});

// Content management queries
export interface PostFilters {
  status?: Post['status'] | 'all';
  search?: string;
  tags?: TaxonomyInput[] | string[];
  categories?: TaxonomyInput[] | string[];
  publishedAfter?: string;
  publishedBefore?: string;
  scheduledAfter?: string;
  scheduledBefore?: string;
}

export interface PostListOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'published_at' | 'scheduled_for' | 'title';
  sortDirection?: 'asc' | 'desc';
  filters?: PostFilters;
}

const buildTaxonomySlugs = (items?: TaxonomyInput[] | string[]) => {
  if (!items) return [] as string[];
  return uniqueStrings(items.map(item => (typeof item === 'string' ? slugify(item) : slugify(item.slug || item.name))));
};

export const getPosts = cache(async (
  supabase: SupabaseClient,
  userId: string,
  options: PostListOptions = {}
) => {
  const {
    limit = 20,
    offset = 0,
    sortBy = 'updated_at',
    sortDirection = 'desc',
    filters = {},
  } = options;

  const query = supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .range(offset, offset + limit - 1)
    .order(sortBy, { ascending: sortDirection === 'asc', nullsFirst: sortBy === 'scheduled_for' });

  if (filters.status && filters.status !== 'all') {
    query.eq('status', filters.status);
  }

  if (filters.search) {
    query.textSearch('search_vector', filters.search, { type: 'websearch' });
  }

  if (filters.tags && filters.tags.length > 0) {
    const tagSlugs = buildTaxonomySlugs(filters.tags);
    if (tagSlugs.length > 0) {
      query.contains('tag_slugs', tagSlugs);
    }
  }

  if (filters.categories && filters.categories.length > 0) {
    const categorySlugs = buildTaxonomySlugs(filters.categories);
    if (categorySlugs.length > 0) {
      query.contains('category_slugs', categorySlugs);
    }
  }

  if (filters.publishedAfter) {
    query.gte('published_at', filters.publishedAfter);
  }

  if (filters.publishedBefore) {
    query.lte('published_at', filters.publishedBefore);
  }

  if (filters.scheduledAfter) {
    query.gte('scheduled_for', filters.scheduledAfter);
  }

  if (filters.scheduledBefore) {
    query.lte('scheduled_for', filters.scheduledBefore);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const hydrated = await hydratePosts(supabase, userId, data || []);

  return {
    posts: hydrated,
    total: count || 0,
    hasMore: offset + limit < (count || 0),
  };
});

export const getPostById = cache(async (
  supabase: SupabaseClient,
  userId: string,
  postId: string
) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .eq('id', postId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const [hydrated] = await hydratePosts(supabase, userId, [data]);
  return hydrated;
});

export const getPostBySlug = cache(async (
  supabase: SupabaseClient,
  userId: string,
  slug: string
) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const [hydrated] = await hydratePosts(supabase, userId, [data]);
  return hydrated;
});

export interface PostInput {
  title: string;
  slug?: string;
  excerpt?: string | null;
  content?: Json;
  status?: Post['status'];
  subscriptionRequired?: boolean;
  allowComments?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[];
  categories?: TaxonomyInput[];
  tags?: TaxonomyInput[];
  mediaAssetIds?: string[];
  featuredMediaId?: string | null;
  publishedAt?: string | null;
  scheduledFor?: string | null;
}

const normalizePostPayload = async (
  supabase: SupabaseClient,
  userId: string,
  payload: PostInput
) => {
  const categories = await upsertTaxonomy(supabase, 'content_categories', userId, payload.categories);
  const tags = await upsertTaxonomy(supabase, 'content_tags', userId, payload.tags);

  const content = payload.content ?? { text: '', html: '' };
  const readingTime = calculateReadingTime(content);

  return {
    payload,
    categories,
    tags,
    readingTime,
    content,
  };
};

export const createPost = async (
  supabase: SupabaseClient,
  userId: string,
  payload: PostInput
) => {
  const { payload: normalized, categories, tags, readingTime, content } = await normalizePostPayload(
    supabase,
    userId,
    payload
  );

  const slug = slugify(normalized.slug || normalized.title);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      title: normalized.title,
      slug,
      excerpt: normalized.excerpt || null,
      content,
      status: normalized.status || 'draft',
      subscription_required: normalized.subscriptionRequired ?? null,
      allow_comments: normalized.allowComments ?? null,
      seo_title: normalized.seoTitle || null,
      seo_description: normalized.seoDescription || null,
      seo_keywords: normalized.seoKeywords || null,
      category_slugs: categories.map(category => category.slug),
      tag_slugs: tags.map(tag => tag.slug),
      media_asset_ids: normalized.mediaAssetIds || null,
      featured_media_id: normalized.featuredMediaId || null,
      published_at: normalized.publishedAt || null,
      scheduled_for: normalized.scheduledFor || null,
      reading_time: readingTime,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select('*')
    .single();

  if (error) throw error;

  await snapshotRevision(supabase, data, userId, 'Initial draft');
  const [hydrated] = await hydratePosts(supabase, userId, [data]);
  return hydrated;
};

export const updatePost = async (
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  payload: Partial<PostInput>
) => {
  const existing = await getPostById(supabase, userId, postId);
  if (!existing) {
    throw new Error('Post not found');
  }

  const mergedPayload: PostInput = {
    title: payload.title || existing.title,
    slug: payload.slug || existing.slug,
    excerpt: payload.excerpt ?? existing.excerpt,
    content: (payload.content as Json | undefined) ?? (existing.content as Json),
    status: payload.status || existing.status,
    subscriptionRequired:
      payload.subscriptionRequired !== undefined ? payload.subscriptionRequired : existing.subscription_required ?? false,
    allowComments: payload.allowComments !== undefined ? payload.allowComments : existing.allow_comments ?? true,
    seoTitle: payload.seoTitle ?? existing.seo_title ?? undefined,
    seoDescription: payload.seoDescription ?? existing.seo_description ?? undefined,
    seoKeywords: payload.seoKeywords ?? existing.seo_keywords ?? undefined,
    categories: payload.categories || existing.categories,
    tags: payload.tags || existing.tags,
    mediaAssetIds: payload.mediaAssetIds || existing.media_asset_ids || undefined,
    featuredMediaId: payload.featuredMediaId ?? existing.featured_media_id ?? undefined,
    publishedAt: payload.publishedAt ?? existing.published_at ?? undefined,
    scheduledFor: payload.scheduledFor ?? existing.scheduled_for ?? undefined,
  };

  const { payload: normalized, categories, tags, readingTime, content } = await normalizePostPayload(
    supabase,
    userId,
    mergedPayload
  );

  const { data, error } = await supabase
    .from('posts')
    .update({
      title: normalized.title,
      slug: slugify(normalized.slug || normalized.title),
      excerpt: normalized.excerpt || null,
      content,
      status: normalized.status || existing.status,
      subscription_required: normalized.subscriptionRequired ?? existing.subscription_required ?? null,
      allow_comments: normalized.allowComments ?? existing.allow_comments ?? null,
      seo_title: normalized.seoTitle || null,
      seo_description: normalized.seoDescription || null,
      seo_keywords: normalized.seoKeywords || null,
      category_slugs: categories.map(category => category.slug),
      tag_slugs: tags.map(tag => tag.slug),
      media_asset_ids: normalized.mediaAssetIds || null,
      featured_media_id: normalized.featuredMediaId || null,
      published_at: normalized.publishedAt || null,
      scheduled_for: normalized.scheduledFor || null,
      reading_time: readingTime,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;

  await snapshotRevision(supabase, data, userId, 'Post updated');
  const [hydrated] = await hydratePosts(supabase, userId, [data]);
  return hydrated;
};

export const deletePost = async (
  supabase: SupabaseClient,
  userId: string,
  postId: string
) => {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
};

export const publishPost = async (
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  options: { publishedAt?: string } = {}
) => {
  const publishedAt = options.publishedAt || new Date().toISOString();
  const { data, error } = await supabase
    .from('posts')
    .update({
      status: 'published',
      published_at: publishedAt,
      scheduled_for: null,
      updated_at: publishedAt,
    })
    .eq('id', postId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  await snapshotRevision(supabase, data, userId, 'Post published');
  const [hydrated] = await hydratePosts(supabase, userId, [data]);
  return hydrated;
};

export const schedulePost = async (
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  schedule: { scheduledFor: string }
) => {
  const { data, error } = await supabase
    .from('posts')
    .update({
      status: 'scheduled',
      scheduled_for: schedule.scheduledFor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  await snapshotRevision(supabase, data, userId, 'Post scheduled');
  const [hydrated] = await hydratePosts(supabase, userId, [data]);
  return hydrated;
};

export const recordPostView = async (
  supabase: SupabaseClient,
  postId: string,
  options: { userId?: string; referrer?: string; device?: string; location?: Json }
) => {
  const viewedAt = new Date();
  const { error: insertError } = await supabase.from('post_view_events').insert({
    post_id: postId,
    user_id: options.userId || null,
    referrer: options.referrer || null,
    device: options.device || null,
    location: options.location || null,
    viewed_at: viewedAt.toISOString(),
  });

  if (insertError) throw insertError;

  const { data: postData } = await supabase
    .from('posts')
    .select('view_count')
    .eq('id', postId)
    .maybeSingle();

  const currentViews = postData?.view_count || 0;

  await supabase
    .from('posts')
    .update({ view_count: currentViews + 1, updated_at: viewedAt.toISOString() })
    .eq('id', postId);

  const isoDate = viewedAt.toISOString().slice(0, 10);
  await updateDailyMetrics(supabase, postId, isoDate, {
    views: 1,
    uniqueViews: options.userId ? 1 : 0,
  });

  return true;
};

export const listPostComments = async (
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  options: { status?: PostComment['status'] | 'all' } = {}
) => {
  await assertPostOwnership(supabase, userId, postId);

  const query = supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (options.status && options.status !== 'all') {
    query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const addPostComment = async (
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  comment: { content: string; parentId?: string | null; metadata?: Json | null }
) => {
  await assertPostOwnership(supabase, userId, postId);

  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      user_id: userId,
      parent_id: comment.parentId || null,
      content: comment.content,
      metadata: comment.metadata || null,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;

  const { data: postData } = await supabase
    .from('posts')
    .select('comment_count')
    .eq('id', postId)
    .maybeSingle();

  const newCount = (postData?.comment_count || 0) + 1;
  await supabase
    .from('posts')
    .update({ comment_count: newCount, updated_at: new Date().toISOString() })
    .eq('id', postId);

  await updateDailyMetrics(supabase, postId, new Date().toISOString().slice(0, 10), {
    comments: 1,
  });

  return data;
};

export const updateCommentStatus = async (
  supabase: SupabaseClient,
  userId: string,
  commentId: string,
  status: PostComment['status']
) => {
  const { data: comment, error: fetchError } = await supabase
    .from('post_comments')
    .select('post_id')
    .eq('id', commentId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!comment) throw new Error('Comment not found');

  await assertPostOwnership(supabase, userId, comment.post_id);

  const { data, error } = await supabase
    .from('post_comments')
    .update({ status })
    .eq('id', commentId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const listPostRevisions = cache(async (
  supabase: SupabaseClient,
  postId: string
) => {
  const { data, error } = await supabase
    .from('post_revisions')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
});

export const listMediaAssets = async (
  supabase: SupabaseClient,
  userId: string,
  options: { limit?: number; offset?: number } = {}
) => {
  const { limit = 50, offset = 0 } = options;
  const { data, error, count } = await supabase
    .from('media_assets')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return {
    assets: data || [],
    total: count || 0,
    hasMore: offset + limit < (count || 0),
  };
};

export const createMediaAsset = async (
  supabase: SupabaseClient,
  userId: string,
  asset: { filename?: string; url: string; mimeType?: string; sizeBytes?: number; metadata?: Json | null }
) => {
  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      user_id: userId,
      filename: asset.filename || null,
      url: asset.url,
      mime_type: asset.mimeType || null,
      size_bytes: asset.sizeBytes || null,
      metadata: asset.metadata || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const deleteMediaAsset = async (
  supabase: SupabaseClient,
  userId: string,
  assetId: string
) => {
  const { error } = await supabase
    .from('media_assets')
    .delete()
    .eq('id', assetId)
    .eq('user_id', userId);

  if (error) throw error;

  // Remove references from posts
  const { data: posts } = await supabase
    .from('posts')
    .select('id, media_asset_ids')
    .eq('user_id', userId)
    .contains('media_asset_ids', [assetId]);

  if (posts && posts.length > 0) {
    for (const post of posts) {
      const filtered = (post.media_asset_ids || []).filter((id: string) => id !== assetId);
      await supabase
        .from('posts')
        .update({ media_asset_ids: filtered, updated_at: new Date().toISOString() })
        .eq('id', post.id);
    }
  }

  return true;
};

export const getPostAnalytics = cache(async (
  supabase: SupabaseClient,
  userId: string,
  options: { limit?: number; status?: Post['status'] | 'all' } = {}
) => {
  const { limit = 50, status } = options;
  const query = supabase
    .from('post_analytics_view')
    .select('*')
    .eq('user_id', userId)
    .order('published_at', { ascending: false, nullsFirst: true })
    .limit(limit);

  if (status && status !== 'all') {
    query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const totalViews = (data || []).reduce((sum, item) => sum + (item.total_views || 0), 0);
  const totalUniqueViews = (data || []).reduce((sum, item) => sum + (item.total_unique_views || 0), 0);
  const totalComments = (data || []).reduce((sum, item) => sum + (item.total_comments || 0), 0);

  return {
    posts: data || [],
    totals: {
      views: totalViews,
      uniqueViews: totalUniqueViews,
      comments: totalComments,
    },
  };
});

export type PostWithRelations = HydratedPost;
export type PostCommentList = PostComment[];
export type PostRevisionList = PostRevision[];
export type PostAnalytics = Awaited<ReturnType<typeof getPostAnalytics>>;

export const searchCompanies = async (
  supabase: SupabaseClient,
  query: string,
  limit = 10
) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('mention_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

// Analytics queries
export const getAnalytics = cache(async (supabase: SupabaseClient, days = 7) => {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalEmails },
    { count: totalCompanies },
    { count: totalMentions },
    { data: topCompanies }
  ] = await Promise.all([
    supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .gte('received_at', startDate),
    
    supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .gte('first_seen_at', startDate),
    
    supabase
      .from('company_mentions')
      .select('*', { count: 'exact', head: true })
      .gte('extracted_at', startDate),
    
    supabase
      .from('companies')
      .select('name, mention_count')
      .order('mention_count', { ascending: false })
      .limit(5)
  ]);

  return {
    totalEmails: totalEmails || 0,
    totalCompanies: totalCompanies || 0,
    totalMentions: totalMentions || 0,
    topCompanies: topCompanies || []
  };
});

// Todo queries
export interface TodoFilters {
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  tags?: string[];
  search?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
  overdue?: boolean;
}

export const getTodos = cache(async (
  supabase: SupabaseClient,
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'position';
    orderDirection?: 'asc' | 'desc';
    filters?: TodoFilters;
  } = {}
) => {
  const {
    limit = 50,
    offset = 0,
    orderBy = 'position',
    orderDirection = 'asc',
    filters = {}
  } = options;

  let query = supabase
    .from('user_todos')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .range(offset, offset + limit - 1);

  // Apply filters
  if (filters.completed !== undefined) {
    query = query.eq('completed', filters.completed);
  }

  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags);
  }

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  if (filters.dueDateStart) {
    query = query.gte('due_date', filters.dueDateStart);
  }

  if (filters.dueDateEnd) {
    query = query.lte('due_date', filters.dueDateEnd);
  }

  if (filters.overdue) {
    query = query.lt('due_date', new Date().toISOString()).eq('completed', false);
  }

  // Apply ordering
  if (orderBy === 'priority') {
    // Custom priority ordering
    query = query.order('priority', { 
      ascending: orderDirection === 'asc',
      nullsFirst: false
    });
  } else {
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    todos: data || [],
    total: count || 0,
    hasMore: (offset + limit) < (count || 0)
  };
});

export const getTodoById = cache(async (supabase: SupabaseClient, userId: string, todoId: string) => {
  const { data, error } = await supabase
    .from('user_todos')
    .select('*')
    .eq('id', todoId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
});

export const createTodo = async (
  supabase: SupabaseClient,
  userId: string,
  todo: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string;
    category?: string;
    tags?: string[];
  }
) => {
  // Get the next position
  const { count } = await supabase
    .from('user_todos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', false);

  const { data, error } = await supabase
    .from('user_todos')
    .insert({
      user_id: userId,
      position: count || 0,
      ...todo
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateTodo = async (
  supabase: SupabaseClient,
  userId: string,
  todoId: string,
  updates: {
    title?: string;
    description?: string;
    completed?: boolean;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string;
    category?: string;
    tags?: string[];
    position?: number;
  }
) => {
  const { data, error } = await supabase
    .from('user_todos')
    .update(updates)
    .eq('id', todoId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteTodo = async (supabase: SupabaseClient, userId: string, todoId: string) => {
  const { error } = await supabase
    .from('user_todos')
    .delete()
    .eq('id', todoId)
    .eq('user_id', userId);

  if (error) throw error;
};

export const toggleTodoCompletion = async (
  supabase: SupabaseClient,
  userId: string,
  todoId: string
) => {
  // First get the current state
  const { data: currentTodo, error: fetchError } = await supabase
    .from('user_todos')
    .select('completed')
    .eq('id', todoId)
    .eq('user_id', userId)
    .single();

  if (fetchError) throw fetchError;

  // Toggle completion
  const { data, error } = await supabase
    .from('user_todos')
    .update({ completed: !currentTodo.completed })
    .eq('id', todoId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getTodoStats = cache(async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .rpc('get_user_todo_stats', { p_user_id: userId })
    .single();

  if (error) throw error;
  return data;
});

export const reorderTodos = async (
  supabase: SupabaseClient,
  userId: string,
  todoUpdates: { id: string; position: number }[]
) => {
  const updates = todoUpdates.map(({ id, position }) => 
    supabase
      .from('user_todos')
      .update({ position })
      .eq('id', id)
      .eq('user_id', userId)
  );

  const results = await Promise.all(updates);
  
  for (const result of results) {
    if (result.error) throw result.error;
  }

  return true;
};

// Types for query responses
export type CompanyWithMentions = Awaited<ReturnType<typeof getCompanyById>>;
export type CompaniesResponse = Awaited<ReturnType<typeof getCompanies>>;
export type EmailWithMentions = Awaited<ReturnType<typeof getEmailById>>;
export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;
export type TodosResponse = Awaited<ReturnType<typeof getTodos>>;
export type TodoStats = Awaited<ReturnType<typeof getTodoStats>>;

// Export Todo type from generated types
export type Todo = UserTodo;

// Export row types
export type { Email, Company, CompanyMention, UserTodo, DailyIntelligence };