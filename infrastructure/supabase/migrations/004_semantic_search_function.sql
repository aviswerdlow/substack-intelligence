-- Add semantic search function for vector similarity queries
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