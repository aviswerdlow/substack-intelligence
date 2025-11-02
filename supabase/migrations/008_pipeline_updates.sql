-- Pipeline Updates Table for SSE Communication
-- This table stores temporary pipeline progress updates that are consumed by the SSE stream

CREATE TABLE IF NOT EXISTS public.pipeline_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  update_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  consumed BOOLEAN DEFAULT FALSE
);

-- Index for efficient querying by user_id and consumption status
CREATE INDEX IF NOT EXISTS idx_pipeline_updates_user_id_consumed
  ON public.pipeline_updates(user_id, consumed, created_at);

-- Auto-delete consumed updates after 5 minutes to prevent table bloat
CREATE INDEX IF NOT EXISTS idx_pipeline_updates_cleanup
  ON public.pipeline_updates(consumed, created_at) WHERE consumed = TRUE;

-- Function to clean up old pipeline updates (both consumed and unconsumed)
CREATE OR REPLACE FUNCTION clean_old_pipeline_updates()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete consumed updates older than 5 minutes
  DELETE FROM public.pipeline_updates
  WHERE consumed = TRUE
    AND created_at < NOW() - INTERVAL '5 minutes';

  -- Delete unconsumed updates older than 15 minutes (stale/abandoned pipelines)
  DELETE FROM public.pipeline_updates
  WHERE consumed = FALSE
    AND created_at < NOW() - INTERVAL '15 minutes';
END;
$$;

-- Optional: Create a cron job to clean up old updates periodically
-- This requires the pg_cron extension (available on Supabase)
-- Uncomment if you want automated cleanup:
-- SELECT cron.schedule(
--   'clean-pipeline-updates',
--   '*/5 * * * *', -- Every 5 minutes
--   $$SELECT clean_old_pipeline_updates()$$
-- );

COMMENT ON TABLE public.pipeline_updates IS 'Temporary storage for pipeline progress updates consumed by SSE streams';
COMMENT ON COLUMN public.pipeline_updates.user_id IS 'User ID from NextAuth authentication';
COMMENT ON COLUMN public.pipeline_updates.update_data IS 'JSON data containing pipeline update info (type, status, progress, message, etc.)';
COMMENT ON COLUMN public.pipeline_updates.consumed IS 'Whether this update has been sent to the client via SSE';
COMMENT ON COLUMN public.pipeline_updates.created_at IS 'When the update was created';
