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

-- Real-time subscriptions view for dashboard (FIXED VERSION)
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
ORDER BY cs.mention_count DESC, cm.confidence DESC;

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
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');