-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Emails table with full-text search
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  sender TEXT NOT NULL,
  newsletter_name TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  raw_html TEXT,
  clean_text TEXT,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', subject), 'A') ||
    setweight(to_tsvector('english', coalesce(clean_text, '')), 'B')
  ) STORED,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for emails table
CREATE INDEX idx_emails_search ON emails USING GIN(search_vector);
CREATE INDEX idx_emails_newsletter ON emails(newsletter_name);
CREATE INDEX idx_emails_received ON emails(received_at DESC);
CREATE INDEX idx_emails_processing_status ON emails(processing_status);

-- Companies table with vector embeddings
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  normalized_name TEXT UNIQUE NOT NULL,
  description TEXT,
  website TEXT,
  funding_status TEXT CHECK (funding_status IN ('unknown', 'bootstrapped', 'seed', 'series-a', 'series-b', 'later-stage', 'public')),
  industry TEXT[] DEFAULT '{}',
  
  -- Vector embedding for similarity search
  embedding vector(1536),
  
  -- Metadata
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  enrichment_status TEXT DEFAULT 'pending' CHECK (enrichment_status IN ('pending', 'enriched', 'failed')),
  
  -- Analytics
  mention_count INTEGER DEFAULT 1,
  newsletter_diversity INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for companies table
CREATE INDEX idx_companies_embedding ON companies 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_normalized_name ON companies(normalized_name);
CREATE INDEX idx_companies_funding_status ON companies(funding_status);
CREATE INDEX idx_companies_mention_count ON companies(mention_count DESC);

-- Company mentions (junction table)
CREATE TABLE company_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  
  context TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')) NOT NULL,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1) NOT NULL,
  
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicates
  UNIQUE(company_id, email_id)
);

-- Indexes for company_mentions table
CREATE INDEX idx_company_mentions_company ON company_mentions(company_id);
CREATE INDEX idx_company_mentions_email ON company_mentions(email_id);
CREATE INDEX idx_company_mentions_confidence ON company_mentions(confidence DESC);
CREATE INDEX idx_company_mentions_sentiment ON company_mentions(sentiment);
CREATE INDEX idx_company_mentions_extracted_at ON company_mentions(extracted_at DESC);

-- Real-time subscriptions view for dashboard
CREATE VIEW daily_intelligence AS
SELECT 
  c.id as company_id,
  c.name,
  c.description,
  c.website,
  c.funding_status,
  cm.id as mention_id,
  cm.context,
  cm.sentiment,
  cm.confidence,
  e.newsletter_name,
  e.received_at,
  COUNT(*) OVER (PARTITION BY c.id) as mention_count,
  COUNT(DISTINCT e.newsletter_name) OVER (PARTITION BY c.id) as newsletter_diversity
FROM company_mentions cm
JOIN companies c ON cm.company_id = c.id
JOIN emails e ON cm.email_id = e.id
WHERE e.received_at > NOW() - INTERVAL '24 hours'
ORDER BY mention_count DESC, cm.confidence DESC;

-- Function to match similar companies using vector similarity
CREATE OR REPLACE FUNCTION match_companies(
  query_company_id UUID,
  match_threshold FLOAT DEFAULT 0.8,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    c.id,
    c.name,
    c.description,
    1 - (c.embedding <=> (SELECT embedding FROM companies WHERE id = query_company_id)) AS similarity
  FROM companies c
  WHERE c.id != query_company_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> (SELECT embedding FROM companies WHERE id = query_company_id)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Function to update company analytics
CREATE OR REPLACE FUNCTION update_company_analytics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE companies SET
    mention_count = (
      SELECT COUNT(*) FROM company_mentions WHERE company_id = NEW.company_id
    ),
    newsletter_diversity = (
      SELECT COUNT(DISTINCT newsletter_name) 
      FROM company_mentions cm 
      JOIN emails e ON cm.email_id = e.id 
      WHERE cm.company_id = NEW.company_id
    ),
    last_updated_at = NOW()
  WHERE id = NEW.company_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update company analytics
CREATE TRIGGER trigger_update_company_analytics
  AFTER INSERT OR UPDATE ON company_mentions
  FOR EACH ROW
  EXECUTE FUNCTION update_company_analytics();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER trigger_update_emails_updated_at
  BEFORE UPDATE ON emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_mentions ENABLE ROW LEVEL SECURITY;

-- Policies (assuming authenticated users for now, expand for multi-tenant later)
CREATE POLICY "Authenticated users can read emails" ON emails
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage emails" ON emails
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Authenticated users can read companies" ON companies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage companies" ON companies
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Authenticated users can read mentions" ON company_mentions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage mentions" ON company_mentions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');-- Add report history table for tracking generated reports
CREATE TABLE report_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
  report_date TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  recipients_count INTEGER DEFAULT 0,
  companies_count INTEGER DEFAULT 0,
  mentions_count INTEGER DEFAULT 0,
  email_id TEXT,
  pdf_size INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for report history
CREATE INDEX idx_report_history_type_date ON report_history(report_type, report_date DESC);
CREATE INDEX idx_report_history_status ON report_history(status);
CREATE INDEX idx_report_history_generated ON report_history(generated_at DESC);

-- User preferences table for report customization
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk user ID
  
  -- Report preferences
  daily_reports_enabled BOOLEAN DEFAULT true,
  weekly_reports_enabled BOOLEAN DEFAULT true,
  report_delivery_time TIME DEFAULT '06:00:00',
  timezone TEXT DEFAULT 'UTC',
  
  -- Email preferences
  email_format TEXT DEFAULT 'html' CHECK (email_format IN ('html', 'text', 'both')),
  include_pdf BOOLEAN DEFAULT true,
  
  -- Content preferences
  minimum_confidence FLOAT DEFAULT 0.6 CHECK (minimum_confidence >= 0 AND minimum_confidence <= 1),
  excluded_newsletters TEXT[], -- Array of newsletter names to exclude
  preferred_industries TEXT[], -- Array of preferred industry categories
  alert_high_mention_count INTEGER DEFAULT 3, -- Alert when company mentioned X+ times
  
  -- Notification preferences
  company_alerts_enabled BOOLEAN DEFAULT false,
  alert_email TEXT, -- Can be different from main email
  slack_webhook TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one preference record per user
  UNIQUE(user_id)
);

-- Indexes for user preferences
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_reports_enabled ON user_preferences(daily_reports_enabled, weekly_reports_enabled);

-- Email delivery log for tracking and analytics
CREATE TABLE email_delivery_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id TEXT NOT NULL, -- From email service (Resend)
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('daily_report', 'weekly_report', 'company_alert', 'test')),
  subject TEXT,
  
  -- Delivery status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Content metadata
  companies_included INTEGER DEFAULT 0,
  pdf_included BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email delivery log
CREATE INDEX idx_email_delivery_log_email_id ON email_delivery_log(email_id);
CREATE INDEX idx_email_delivery_log_recipient ON email_delivery_log(recipient_email);
CREATE INDEX idx_email_delivery_log_type_status ON email_delivery_log(email_type, status);
CREATE INDEX idx_email_delivery_log_created ON email_delivery_log(created_at DESC);

-- Report subscriptions table for managing recipients
CREATE TABLE report_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  user_id TEXT, -- Optional - for registered users
  
  -- Subscription preferences
  daily_reports BOOLEAN DEFAULT true,
  weekly_reports BOOLEAN DEFAULT true,
  company_alerts BOOLEAN DEFAULT false,
  
  -- Subscription metadata
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'signup', 'invite')),
  confirmed BOOLEAN DEFAULT false,
  confirmation_token TEXT UNIQUE,
  
  -- Unsubscribe handling
  unsubscribed BOOLEAN DEFAULT false,
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_token TEXT UNIQUE DEFAULT uuid_generate_v4(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique email subscriptions
  UNIQUE(email)
);

-- Indexes for report subscriptions
CREATE INDEX idx_report_subscriptions_email ON report_subscriptions(email);
CREATE INDEX idx_report_subscriptions_user_id ON report_subscriptions(user_id);
CREATE INDEX idx_report_subscriptions_active ON report_subscriptions(unsubscribed) WHERE NOT unsubscribed;
CREATE INDEX idx_report_subscriptions_confirmation ON report_subscriptions(confirmation_token);
CREATE INDEX idx_report_subscriptions_unsubscribe ON report_subscriptions(unsubscribe_token);

-- Function to get active report recipients
CREATE OR REPLACE FUNCTION get_active_report_recipients(report_type TEXT DEFAULT 'daily')
RETURNS TABLE(
  email TEXT,
  user_id TEXT
)
LANGUAGE SQL STABLE
AS $$
  SELECT 
    rs.email,
    rs.user_id
  FROM report_subscriptions rs
  WHERE rs.unsubscribed = false 
    AND rs.confirmed = true
    AND (
      (report_type = 'daily' AND rs.daily_reports = true) OR
      (report_type = 'weekly' AND rs.weekly_reports = true) OR
      (report_type = 'alert' AND rs.company_alerts = true)
    );
$$;

-- Function to update report history status
CREATE OR REPLACE FUNCTION update_report_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER trigger_update_report_history_updated_at
  BEFORE UPDATE ON report_history
  FOR EACH ROW
  EXECUTE FUNCTION update_report_status();

CREATE TRIGGER trigger_update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_email_delivery_log_updated_at
  BEFORE UPDATE ON email_delivery_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_report_subscriptions_updated_at
  BEFORE UPDATE ON report_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security for new tables
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for report tables
CREATE POLICY "Authenticated users can read report history" ON report_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage report history" ON report_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can read their own preferences" ON user_preferences
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can manage preferences" ON user_preferences
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage email delivery log" ON email_delivery_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage subscriptions" ON report_subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');-- Add missing enrichment columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS founded_year INTEGER,
ADD COLUMN IF NOT EXISTS employee_count INTEGER,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS website_validation JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tech_stack TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS enrichment_confidence FLOAT,
ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_companies_location ON companies(location);
CREATE INDEX IF NOT EXISTS idx_companies_founded_year ON companies(founded_year);
CREATE INDEX IF NOT EXISTS idx_companies_employee_count ON companies(employee_count);
CREATE INDEX IF NOT EXISTS idx_companies_enrichment_confidence ON companies(enrichment_confidence DESC);
CREATE INDEX IF NOT EXISTS idx_companies_last_enriched_at ON companies(last_enriched_at DESC);

-- Create GIN index for JSONB columns
CREATE INDEX IF NOT EXISTS idx_companies_social_links ON companies USING GIN(social_links);
CREATE INDEX IF NOT EXISTS idx_companies_website_validation ON companies USING GIN(website_validation);

-- Update the daily intelligence view to include enrichment data
DROP VIEW IF EXISTS daily_intelligence;
CREATE VIEW daily_intelligence AS
WITH company_stats AS (
  SELECT 
    c.id as company_id,
    COUNT(DISTINCT cm.id) as mention_count,
    COUNT(DISTINCT e.newsletter_name) as newsletter_diversity
  FROM companies c
  JOIN company_mentions cm ON cm.company_id = c.id
  JOIN emails e ON cm.email_id = e.id
  WHERE e.received_at > NOW() - INTERVAL '24 hours'
  GROUP BY c.id
)
SELECT 
  c.id as company_id,
  c.name,
  c.description,
  c.website,
  c.funding_status,
  c.location,
  c.founded_year,
  c.employee_count,
  c.enrichment_confidence,
  c.last_enriched_at,
  cm.id as mention_id,
  cm.context,
  cm.sentiment,
  cm.confidence,
  e.newsletter_name,
  e.received_at,
  cs.mention_count,
  cs.newsletter_diversity
FROM company_mentions cm
JOIN companies c ON cm.company_id = c.id
JOIN emails e ON cm.email_id = e.id
JOIN company_stats cs ON cs.company_id = c.id
WHERE e.received_at > NOW() - INTERVAL '24 hours'
ORDER BY cs.mention_count DESC, cm.confidence DESC;-- Add semantic search function for vector similarity queries
CREATE OR REPLACE FUNCTION semantic_search_companies(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  similarity float
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    c.id,
    c.name,
    c.description,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM companies c
  WHERE c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Create an index for better semantic search performance
CREATE INDEX IF NOT EXISTS idx_companies_embedding_cosine ON companies 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Function to find companies similar to a given company (enhanced version)
CREATE OR REPLACE FUNCTION match_companies(
  query_company_id UUID,
  match_threshold FLOAT DEFAULT 0.8,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    c.id,
    c.name,
    c.description,
    1 - (c.embedding <=> (SELECT embedding FROM companies WHERE id = query_company_id)) AS similarity
  FROM companies c
  WHERE c.id != query_company_id
    AND c.embedding IS NOT NULL
    AND (SELECT embedding FROM companies WHERE id = query_company_id) IS NOT NULL
    AND 1 - (c.embedding <=> (SELECT embedding FROM companies WHERE id = query_company_id)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Add embedding generation tracking table
CREATE TABLE IF NOT EXISTS embedding_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1, -- 1=high, 2=normal, 3=low
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Prevent duplicates
  UNIQUE(company_id)
);

-- Indexes for embedding queue
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON embedding_queue(status);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_priority ON embedding_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_company ON embedding_queue(company_id);

-- Function to automatically add new companies to embedding queue
CREATE OR REPLACE FUNCTION queue_company_for_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue if company doesn't already have an embedding
  IF NEW.embedding IS NULL THEN
    INSERT INTO embedding_queue (company_id, priority)
    VALUES (NEW.id, 2) -- Normal priority for new companies
    ON CONFLICT (company_id) DO NOTHING; -- Ignore if already queued
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically queue new companies for embedding generation
CREATE TRIGGER trigger_queue_new_company_embedding
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION queue_company_for_embedding();

-- Function to get next companies for embedding processing
CREATE OR REPLACE FUNCTION get_next_embedding_batch(
  batch_size INTEGER DEFAULT 10
)
RETURNS TABLE(
  company_id UUID,
  company_name TEXT,
  priority INTEGER
)
LANGUAGE SQL
AS $$
  SELECT 
    eq.company_id,
    c.name as company_name,
    eq.priority
  FROM embedding_queue eq
  JOIN companies c ON eq.company_id = c.id
  WHERE eq.status = 'pending'
  ORDER BY eq.priority ASC, eq.created_at ASC
  LIMIT batch_size;
$$;

-- Function to update embedding queue status
CREATE OR REPLACE FUNCTION update_embedding_queue_status(
  company_id UUID,
  new_status TEXT,
  error_msg TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE SQL
AS $$
  UPDATE embedding_queue 
  SET 
    status = new_status,
    error_message = error_msg,
    processed_at = CASE WHEN new_status IN ('completed', 'failed') THEN NOW() ELSE processed_at END
  WHERE company_id = company_id;
$$;