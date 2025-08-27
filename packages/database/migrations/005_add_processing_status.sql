-- Add processing status columns for hybrid pipeline processing
-- This allows us to track which emails have been processed and handle background processing

ALTER TABLE public.emails 
ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(20) DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS extraction_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS extraction_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS extraction_error TEXT,
ADD COLUMN IF NOT EXISTS companies_extracted INTEGER DEFAULT 0;

-- Create index for efficient querying of pending emails
CREATE INDEX IF NOT EXISTS idx_emails_extraction_status ON public.emails(user_id, extraction_status, received_at DESC);

-- Create index for finding users with pending emails
CREATE INDEX IF NOT EXISTS idx_emails_pending_by_user ON public.emails(user_id, extraction_status) WHERE extraction_status = 'pending';

COMMENT ON COLUMN public.emails.extraction_status IS 'Status of company extraction from this email';
COMMENT ON COLUMN public.emails.extraction_started_at IS 'When extraction processing began';
COMMENT ON COLUMN public.emails.extraction_completed_at IS 'When extraction processing completed';
COMMENT ON COLUMN public.emails.extraction_error IS 'Error message if extraction failed';
COMMENT ON COLUMN public.emails.companies_extracted IS 'Number of companies extracted from this email';