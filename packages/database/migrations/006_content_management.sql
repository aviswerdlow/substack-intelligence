-- Content management system schema for posts, media, comments, and analytics
-- This migration creates the core tables required to power the content
-- authoring and publishing workflow including posts, taxonomies, media
-- assets, revision history, comments, and view analytics.

-- Posts table stores author managed content with scheduling, SEO and
-- analytics metadata. We use arrays for tag/category slugs and media IDs
-- to simplify filtering while retaining dedicated taxonomy tables for
-- additional metadata.
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  subscription_required BOOLEAN DEFAULT FALSE,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  category_slugs TEXT[] DEFAULT ARRAY[]::TEXT[],
  tag_slugs TEXT[] DEFAULT ARRAY[]::TEXT[],
  media_asset_ids UUID[] DEFAULT ARRAY[]::UUID[],
  featured_media_id UUID,
  allow_comments BOOLEAN DEFAULT TRUE,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  reading_time INTEGER DEFAULT 0,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce((content->>'text'), '')), 'C')
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_for ON public.posts(scheduled_for DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_posts_search ON public.posts USING GIN (search_vector);

-- Taxonomy tables allow admins to manage reusable categories and tags.
CREATE TABLE IF NOT EXISTS public.content_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS public.content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

-- Media asset library stores references to uploaded files. We only store
-- metadata and external URLs which keeps the schema flexible across
-- storage providers (Supabase storage, S3, Cloudinary, etc.).
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  filename TEXT,
  url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_user ON public.media_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_created ON public.media_assets(created_at DESC);

-- Revision history stores a snapshot of content for auditing and rollback.
CREATE TABLE IF NOT EXISTS public.post_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  editor_id TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content JSONB NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_revisions_post ON public.post_revisions(post_id, created_at DESC);

-- Comments system supports threaded moderation queues with status tracking.
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  parent_id UUID REFERENCES public.post_comments(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_status ON public.post_comments(status);

-- View analytics table records granular viewing data for downstream
-- aggregation and content performance insights.
CREATE TABLE IF NOT EXISTS public.post_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  referrer TEXT,
  device TEXT,
  location JSONB
);

CREATE INDEX IF NOT EXISTS idx_post_views_post ON public.post_view_events(post_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_user ON public.post_view_events(user_id) WHERE user_id IS NOT NULL;

-- Daily aggregated metrics provide fast analytics queries for dashboards.
CREATE TABLE IF NOT EXISTS public.post_metrics_daily (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  PRIMARY KEY (post_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_post_metrics_date ON public.post_metrics_daily(metric_date DESC);

-- Helper view that exposes aggregated analytics for quick querying.
CREATE OR REPLACE VIEW public.post_analytics_view AS
SELECT
  p.id AS post_id,
  p.user_id,
  p.title,
  p.slug,
  p.status,
  p.published_at,
  p.scheduled_for,
  p.view_count,
  p.comment_count,
  COALESCE(SUM(m.views), 0) AS total_views,
  COALESCE(SUM(m.unique_views), 0) AS total_unique_views,
  COALESCE(SUM(m.comments), 0) AS total_comments
FROM public.posts p
LEFT JOIN public.post_metrics_daily m ON m.post_id = p.id
GROUP BY p.id;

COMMENT ON VIEW public.post_analytics_view IS 'Aggregated analytics for posts combining live counters with daily metrics';
