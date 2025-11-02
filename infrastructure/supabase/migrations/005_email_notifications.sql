-- Email notification infrastructure
-- Adds email_preferences and email_logs tables for managing notification workflows

-- Ensure pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id TEXT PRIMARY KEY REFERENCES public.user_settings(user_id) ON DELETE CASCADE,
  newsletter BOOLEAN DEFAULT true,
  new_posts BOOLEAN DEFAULT true,
  comments BOOLEAN DEFAULT true,
  marketing BOOLEAN DEFAULT false,
  product_updates BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'daily',
  preferred_format TEXT DEFAULT 'html' CHECK (preferred_format IN ('html', 'text', 'both')),
  timezone TEXT DEFAULT 'UTC',
  unsubscribe_token TEXT UNIQUE,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES public.user_settings(user_id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (
    email_type IN (
      'welcome',
      'password_reset',
      'newsletter',
      'new_post',
      'subscription_confirmation',
      'transactional',
      'test'
    )
  ),
  subject TEXT,
  status TEXT NOT NULL CHECK (
    status IN (
      'queued',
      'sent',
      'delivered',
      'opened',
      'clicked',
      'bounced',
      'complained',
      'failed'
    )
  ),
  provider TEXT DEFAULT 'resend',
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON public.email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_token ON public.email_preferences(unsubscribe_token);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON public.email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

-- Update timestamps automatically
CREATE TRIGGER trigger_update_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own email preferences" ON public.email_preferences
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Service role can manage email preferences" ON public.email_preferences
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view own email logs" ON public.email_logs
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can manage email logs" ON public.email_logs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON public.email_preferences TO authenticated;
GRANT ALL ON public.email_preferences TO service_role;
GRANT SELECT ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;
