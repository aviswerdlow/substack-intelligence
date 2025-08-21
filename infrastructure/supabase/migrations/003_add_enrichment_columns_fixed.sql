-- Add missing enrichment columns to companies table
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
ORDER BY cs.mention_count DESC, cm.confidence DESC;