-- Add report history table for tracking generated reports
CREATE TABLE report_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
  report_date TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  recipients_count INTEGER DEFAULT 0,
  companies_count INTEGER DEFAULT 0,
  mentions_count INTEGER DEFAULT 0,
  email_id TEXT,
  pdf_size INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for report history
CREATE INDEX IF NOT EXISTS idx_report_history_type_date ON report_history(report_type, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_report_history_status ON report_history(status);
CREATE INDEX IF NOT EXISTS idx_report_history_generated ON report_history(generated_at DESC);

-- User preferences table for report customization
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- NextAuth user ID
  
  -- Report preferences
  daily_reports_enabled BOOLEAN DEFAULT true,
  weekly_reports_enabled BOOLEAN DEFAULT true,
  report_delivery_time TIME DEFAULT '06:00:00',
  timezone TEXT DEFAULT 'UTC',
  
  -- Email preferences
  email_format TEXT DEFAULT 'html' CHECK (email_format IN ('html', 'text', 'both')),
  include_pdf BOOLEAN DEFAULT true,
  
  -- Content preferences
  minimum_confidence FLOAT DEFAULT 0.6 CHECK (minimum_confidence >= 0 AND minimum_confidence <= 1),
  excluded_newsletters TEXT[], -- Array of newsletter names to exclude
  preferred_industries TEXT[], -- Array of preferred industry categories
  alert_high_mention_count INTEGER DEFAULT 3, -- Alert when company mentioned X+ times
  
  -- Notification preferences
  company_alerts_enabled BOOLEAN DEFAULT false,
  alert_email TEXT, -- Can be different from main email
  slack_webhook TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one preference record per user
  UNIQUE(user_id)
);

-- Indexes for user preferences
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_reports_enabled ON user_preferences(daily_reports_enabled, weekly_reports_enabled);

-- Email delivery log for tracking and analytics
CREATE TABLE email_delivery_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id TEXT NOT NULL, -- From email service (Resend)
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('daily_report', 'weekly_report', 'company_alert', 'test')),
  subject TEXT,
  
  -- Delivery status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Content metadata
  companies_included INTEGER DEFAULT 0,
  pdf_included BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email delivery log
CREATE INDEX idx_email_delivery_log_email_id ON email_delivery_log(email_id);
CREATE INDEX idx_email_delivery_log_recipient ON email_delivery_log(recipient_email);
CREATE INDEX idx_email_delivery_log_type_status ON email_delivery_log(email_type, status);
CREATE INDEX idx_email_delivery_log_created ON email_delivery_log(created_at DESC);

-- Report subscriptions table for managing recipients
CREATE TABLE report_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  user_id TEXT, -- Optional - for registered users
  
  -- Subscription preferences
  daily_reports BOOLEAN DEFAULT true,
  weekly_reports BOOLEAN DEFAULT true,
  company_alerts BOOLEAN DEFAULT false,
  
  -- Subscription metadata
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'signup', 'invite')),
  confirmed BOOLEAN DEFAULT false,
  confirmation_token TEXT UNIQUE,
  
  -- Unsubscribe handling
  unsubscribed BOOLEAN DEFAULT false,
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_token TEXT UNIQUE DEFAULT uuid_generate_v4(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique email subscriptions
  UNIQUE(email)
);

-- Indexes for report subscriptions
CREATE INDEX idx_report_subscriptions_email ON report_subscriptions(email);
CREATE INDEX idx_report_subscriptions_user_id ON report_subscriptions(user_id);
CREATE INDEX idx_report_subscriptions_active ON report_subscriptions(unsubscribed) WHERE NOT unsubscribed;
CREATE INDEX idx_report_subscriptions_confirmation ON report_subscriptions(confirmation_token);
CREATE INDEX idx_report_subscriptions_unsubscribe ON report_subscriptions(unsubscribe_token);

-- Function to get active report recipients
CREATE OR REPLACE FUNCTION get_active_report_recipients(report_type TEXT DEFAULT 'daily')
RETURNS TABLE(
  email TEXT,
  user_id TEXT
)
LANGUAGE SQL STABLE
AS $$
  SELECT 
    rs.email,
    rs.user_id
  FROM report_subscriptions rs
  WHERE rs.unsubscribed = false 
    AND rs.confirmed = true
    AND (
      (report_type = 'daily' AND rs.daily_reports = true) OR
      (report_type = 'weekly' AND rs.weekly_reports = true) OR
      (report_type = 'alert' AND rs.company_alerts = true)
    );
$$;

-- Function to update report history status
CREATE OR REPLACE FUNCTION update_report_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER trigger_update_report_history_updated_at
  BEFORE UPDATE ON report_history
  FOR EACH ROW
  EXECUTE FUNCTION update_report_status();

CREATE TRIGGER trigger_update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_email_delivery_log_updated_at
  BEFORE UPDATE ON email_delivery_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_report_subscriptions_updated_at
  BEFORE UPDATE ON report_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security for new tables
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for report tables
CREATE POLICY "Authenticated users can read report history" ON report_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage report history" ON report_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can read their own preferences" ON user_preferences
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can manage preferences" ON user_preferences
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage email delivery log" ON email_delivery_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage subscriptions" ON report_subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');