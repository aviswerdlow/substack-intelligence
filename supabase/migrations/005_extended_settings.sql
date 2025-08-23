-- Extend user_preferences table to support comprehensive settings
ALTER TABLE public.user_preferences RENAME TO user_settings;

-- Add comprehensive settings columns
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS 
  -- Account settings
  account_settings JSONB DEFAULT '{"name": "", "email": "", "role": "User", "timezone": "America/New_York"}',
  
  -- Newsletter settings
  newsletter_settings JSONB DEFAULT '{"sources": [], "autoSubscribe": true, "digestFrequency": "weekly"}',
  
  -- Company tracking settings
  company_settings JSONB DEFAULT '{"tracking": [], "autoDetect": true, "minimumMentions": 3}',
  
  -- AI configuration
  ai_settings JSONB DEFAULT '{"provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "temperature": 0.7, "maxTokens": 4096, "enableEnrichment": true}',
  
  -- Email integration settings (keep existing columns for backward compatibility)
  email_settings JSONB DEFAULT '{"provider": "gmail", "syncFrequency": "15min", "autoProcess": true, "retentionDays": 90}',
  
  -- Report settings
  report_settings JSONB DEFAULT '{"defaultFormat": "pdf", "includeCharts": true, "includeSentiment": true, "autoGenerate": {"daily": false, "weekly": false, "monthly": false}, "deliveryTime": "09:00", "recipients": []}',
  
  -- Privacy settings
  privacy_settings JSONB DEFAULT '{"dataRetention": 365, "shareAnalytics": true, "allowExport": true}',
  
  -- Appearance settings
  appearance_settings JSONB DEFAULT '{"theme": "system", "accentColor": "blue", "fontSize": "medium", "compactMode": false, "showTips": true}',
  
  -- Notification settings
  notification_settings JSONB DEFAULT '{"email": {"enabled": true, "criticalOnly": false, "dailyDigest": true}, "inApp": {"enabled": true, "soundEnabled": false}, "thresholds": {"negativeSentiment": -0.5, "mentionVolume": 10, "competitorMentions": true}}';

-- Create separate tables for complex entities

-- API Keys table
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.user_settings(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL, -- Store hashed version for security
  key_prefix TEXT NOT NULL, -- First 8 characters for display
  permissions JSONB DEFAULT '[]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS public.user_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.user_settings(user_id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events JSONB DEFAULT '[]',
  enabled BOOLEAN DEFAULT true,
  secret TEXT, -- Webhook signing secret
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Newsletter Sources table (for better relational structure)
CREATE TABLE IF NOT EXISTS public.newsletter_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.user_settings(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'daily',
  last_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tracked Companies table
CREATE TABLE IF NOT EXISTS public.tracked_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.user_settings(user_id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  keywords JSONB DEFAULT '[]',
  enabled BOOLEAN DEFAULT true,
  alert_threshold INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON public.user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_webhooks_user_id ON public.user_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sources_user_id ON public.newsletter_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_companies_user_id ON public.tracked_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_companies_company_id ON public.tracked_companies(company_id);

-- Enable RLS on new tables
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "Users can manage own API keys" ON public.user_api_keys
  FOR ALL USING (true); -- Application will handle user filtering

CREATE POLICY "Users can manage own webhooks" ON public.user_webhooks
  FOR ALL USING (true); -- Application will handle user filtering

CREATE POLICY "Users can manage own newsletter sources" ON public.newsletter_sources
  FOR ALL USING (true); -- Application will handle user filtering

CREATE POLICY "Users can manage own tracked companies" ON public.tracked_companies
  FOR ALL USING (true); -- Application will handle user filtering

-- Update triggers for new tables
CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE
  ON public.user_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_webhooks_updated_at BEFORE UPDATE
  ON public.user_webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_sources_updated_at BEFORE UPDATE
  ON public.newsletter_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracked_companies_updated_at BEFORE UPDATE
  ON public.tracked_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing data
UPDATE public.user_settings SET 
  email_settings = jsonb_build_object(
    'provider', 'gmail',
    'connected', COALESCE(gmail_connected, false),
    'syncFrequency', '15min',
    'lastSync', gmail_token_expiry,
    'autoProcess', true,
    'retentionDays', 90
  )
WHERE email_settings IS NULL OR email_settings = '{}'::jsonb;