# Fix Pipeline Infinite Loop - Apply Missing Migration

## Problem
Your pipeline is stuck in an infinite loop because the SSE stream is trying to access a `pipeline_updates` table that doesn't exist in your Supabase database.

## Solution
Run the migration file `supabase/migrations/008_pipeline_updates.sql` in your Supabase project.

## Quick Fix Steps

### Option 1: Supabase Dashboard (Fastest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Copy and paste this SQL:

```sql
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

COMMENT ON TABLE public.pipeline_updates IS 'Temporary storage for pipeline progress updates consumed by SSE streams';
COMMENT ON COLUMN public.pipeline_updates.user_id IS 'User ID from Clerk authentication';
COMMENT ON COLUMN public.pipeline_updates.update_data IS 'JSON data containing pipeline update info (type, status, progress, message, etc.)';
COMMENT ON COLUMN public.pipeline_updates.consumed IS 'Whether this update has been sent to the client via SSE';
COMMENT ON COLUMN public.pipeline_updates.created_at IS 'When the update was created';
```

4. Click **Run** to execute the migration
5. You should see "Success: No rows returned" message

### Option 2: Supabase CLI

If you have Supabase CLI installed and linked to your project:

```bash
npx supabase db push
```

This will apply all pending migrations including the `008_pipeline_updates.sql` file.

## After Applying the Migration

1. **Unlock the stuck pipeline** (if needed):
   - Open your app in the browser
   - Open DevTools Console (F12)
   - Run: `await fetch('/api/pipeline/unlock', { method: 'POST' }).then(r => r.json())`

2. **Test the pipeline**:
   - Try running the pipeline again
   - It should now complete successfully without hanging

## Verification

To verify the table was created successfully, run this in Supabase SQL Editor:

```sql
SELECT * FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'pipeline_updates';
```

You should see one row returned showing the table exists.

## What This Fixes

- ✅ Stops the infinite SSE polling loop
- ✅ Allows pipeline updates to be stored and retrieved properly
- ✅ Enables real-time progress updates to work correctly
- ✅ Prevents the "Could not find the table 'public.pipeline_updates'" error

## Need Help?

If you encounter any issues:
1. Check that you're in the correct Supabase project
2. Ensure you have the necessary permissions to create tables
3. Look for any error messages in the SQL editor after running the migration