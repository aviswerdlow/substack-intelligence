-- Create user_settings table for storing Gmail OAuth tokens and user preferences
-- Run this SQL in your Supabase SQL editor

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  gmail_connected BOOLEAN DEFAULT false,
  gmail_refresh_token TEXT,
  gmail_access_token TEXT,
  gmail_token_expiry TIMESTAMPTZ,
  gmail_email TEXT,
  notifications_enabled BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'daily',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id 
ON public.user_settings(user_id);

-- 3. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Create trigger to call the function before updates
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;

CREATE TRIGGER update_user_settings_updated_at 
BEFORE UPDATE ON public.user_settings 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies

-- Policy for users to read their own settings
CREATE POLICY "Users can view own settings" 
ON public.user_settings FOR SELECT 
USING (auth.uid()::text = user_id);

-- Policy for users to insert their own settings
CREATE POLICY "Users can insert own settings" 
ON public.user_settings FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

-- Policy for users to update their own settings
CREATE POLICY "Users can update own settings" 
ON public.user_settings FOR UPDATE 
USING (auth.uid()::text = user_id);

-- Policy for service role to manage all settings
CREATE POLICY "Service role can manage all settings" 
ON public.user_settings FOR ALL 
USING (auth.role() = 'service_role');

-- 7. Grant permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;

-- 8. Create a comment on the table for documentation
COMMENT ON TABLE public.user_settings IS 'Stores user settings including Gmail OAuth tokens and notification preferences';
COMMENT ON COLUMN public.user_settings.user_id IS 'NextAuth user ID';
COMMENT ON COLUMN public.user_settings.gmail_refresh_token IS 'Encrypted Gmail OAuth refresh token';
COMMENT ON COLUMN public.user_settings.gmail_access_token IS 'Encrypted Gmail OAuth access token';
COMMENT ON COLUMN public.user_settings.gmail_token_expiry IS 'Timestamp when the access token expires';
COMMENT ON COLUMN public.user_settings.gmail_email IS 'The Gmail address connected';
COMMENT ON COLUMN public.user_settings.digest_frequency IS 'Frequency for email digests: daily, weekly, or monthly';

-- Verification query to check if table was created successfully
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'user_settings'
ORDER BY 
  ordinal_position;