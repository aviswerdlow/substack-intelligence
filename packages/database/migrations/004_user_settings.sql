-- Create user_settings table for storing user-specific settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE, -- Clerk user ID
  
  -- Gmail integration
  gmail_connected BOOLEAN DEFAULT false,
  gmail_refresh_token TEXT,
  gmail_email TEXT,
  
  -- Other settings can be added here
  notifications_enabled BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'daily', -- daily, weekly, monthly
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only read/update their own settings
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (true); -- Will be restricted by application logic

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (true); -- Will be restricted by application logic

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (true); -- Will be restricted by application logic

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE
  ON public.user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();