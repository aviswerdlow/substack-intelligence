-- Create analytics events table (matching Supabase migration)
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NULL,
  session_id TEXT NULL,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'user',
  conversion_stage TEXT NULL,
  context_path TEXT NULL,
  referrer TEXT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_events_user_idx ON analytics_events (user_id);
CREATE INDEX IF NOT EXISTS analytics_events_category_idx ON analytics_events (event_category);
CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON analytics_events (created_at DESC);

-- Create analytics page views table
CREATE TABLE IF NOT EXISTS analytics_page_views (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NULL,
  session_id TEXT NULL,
  path TEXT NOT NULL,
  referrer TEXT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_page_views_user_idx ON analytics_page_views (user_id);
CREATE INDEX IF NOT EXISTS analytics_page_views_path_idx ON analytics_page_views (path);
CREATE INDEX IF NOT EXISTS analytics_page_views_created_idx ON analytics_page_views (created_at DESC);

