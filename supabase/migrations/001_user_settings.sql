-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  gmail_connected BOOLEAN DEFAULT false NOT NULL,
  gmail_refresh_token TEXT,
  gmail_access_token TEXT,
  gmail_token_expiry TIMESTAMPTZ,
  gmail_email TEXT,
  notifications_enabled BOOLEAN DEFAULT true NOT NULL,
  digest_frequency TEXT DEFAULT 'daily' NOT NULL,
  
  -- Extended settings as JSONB
  account_settings JSONB DEFAULT '{}',
  newsletter_settings JSONB DEFAULT '{"autoSubscribe": true, "digestFrequency": "weekly"}',
  company_settings JSONB DEFAULT '{"autoDetect": true, "minimumMentions": 3}',
  ai_settings JSONB DEFAULT '{"provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "temperature": 0.7, "maxTokens": 4096, "enableEnrichment": true}',
  email_settings JSONB DEFAULT '{"syncFrequency": "15min", "autoProcess": true, "retentionDays": 90}',
  report_settings JSONB DEFAULT '{"defaultFormat": "pdf", "includeCharts": true, "includeSentiment": true, "autoGenerate": {"daily": false, "weekly": false, "monthly": false}, "deliveryTime": "09:00", "recipients": []}',
  notification_settings JSONB DEFAULT '{"email": {"enabled": true, "criticalOnly": false, "dailyDigest": true}, "inApp": {"enabled": true, "soundEnabled": false}, "thresholds": {"negativeSentiment": -0.5, "mentionVolume": 10, "competitorMentions": true}}',
  privacy_settings JSONB DEFAULT '{"dataRetention": 365, "shareAnalytics": true, "allowExport": true}',
  appearance_settings JSONB DEFAULT '{"theme": "system", "accentColor": "blue", "fontSize": "medium", "compactMode": false, "showTips": true}',
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create user_api_keys table
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions JSONB DEFAULT '[]',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name)
);

-- Create user_webhooks table
CREATE TABLE IF NOT EXISTS public.user_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  enabled BOOLEAN DEFAULT true NOT NULL,
  secret TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create newsletter_sources table
CREATE TABLE IF NOT EXISTS public.newsletter_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true NOT NULL,
  frequency TEXT DEFAULT 'daily' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create tracked_companies table
CREATE TABLE IF NOT EXISTS public.tracked_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  domain TEXT,
  keywords TEXT[] DEFAULT '{}',
  enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON public.user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_webhooks_user_id ON public.user_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sources_user_id ON public.newsletter_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_companies_user_id ON public.tracked_companies(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_webhooks_updated_at BEFORE UPDATE ON public.user_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_sources_updated_at BEFORE UPDATE ON public.newsletter_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracked_companies_updated_at BEFORE UPDATE ON public.tracked_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allows service role full access)
CREATE POLICY "Service role can manage user_settings" ON public.user_settings
  FOR ALL USING (true);

CREATE POLICY "Service role can manage user_api_keys" ON public.user_api_keys
  FOR ALL USING (true);

CREATE POLICY "Service role can manage user_webhooks" ON public.user_webhooks
  FOR ALL USING (true);

CREATE POLICY "Service role can manage newsletter_sources" ON public.newsletter_sources
  FOR ALL USING (true);

CREATE POLICY "Service role can manage tracked_companies" ON public.tracked_companies
  FOR ALL USING (true);