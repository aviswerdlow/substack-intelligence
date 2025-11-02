-- Analytics tracking tables for front-end instrumentation
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  session_id TEXT,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  conversion_stage TEXT,
  context_path TEXT,
  referrer TEXT,
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS analytics_page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  session_id TEXT,
  path TEXT NOT NULL,
  referrer TEXT,
  properties JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_page_views_path ON analytics_page_views(path);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_occurred ON analytics_page_views(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_session ON analytics_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_user ON analytics_page_views(user_id);

ALTER TABLE analytics_page_views ENABLE ROW LEVEL SECURITY;

-- Policies allow read/write access via the service role while keeping data private by default
CREATE POLICY service_role_insert_analytics_events
  ON analytics_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY service_role_select_analytics_events
  ON analytics_events
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY service_role_insert_analytics_page_views
  ON analytics_page_views
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY service_role_select_analytics_page_views
  ON analytics_page_views
  FOR SELECT
  TO service_role
  USING (true);
