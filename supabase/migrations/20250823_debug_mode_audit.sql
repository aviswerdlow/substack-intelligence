-- Debug Mode Audit Table
-- Tracks all debug mode changes and attempts for security compliance

CREATE TABLE IF NOT EXISTS debug_mode_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('ATTEMPT', 'BLOCKED', 'ENABLED', 'DISABLED', 'AUTO_DISABLED', 'FORCE_DISABLED')),
    environment VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT,
    user_email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    reason TEXT,
    metadata JSONB,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_debug_audit_timestamp ON debug_mode_audit(timestamp DESC);
CREATE INDEX idx_debug_audit_environment ON debug_mode_audit(environment);
CREATE INDEX idx_debug_audit_type ON debug_mode_audit(type);
CREATE INDEX idx_debug_audit_severity ON debug_mode_audit(severity);
CREATE INDEX idx_debug_audit_user_id ON debug_mode_audit(user_id);

-- Index for finding critical incidents
CREATE INDEX idx_debug_audit_critical ON debug_mode_audit(severity, timestamp DESC) 
WHERE severity = 'critical';

-- Index for production environment queries
CREATE INDEX idx_debug_audit_production ON debug_mode_audit(environment, timestamp DESC) 
WHERE environment = 'production';

-- Row Level Security
ALTER TABLE debug_mode_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY service_role_all ON debug_mode_audit
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Authenticated users can read their own entries
CREATE POLICY users_read_own ON debug_mode_audit
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Policy: Admin users can read all entries
CREATE POLICY admin_read_all ON debug_mode_audit
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Function to automatically log debug mode changes
CREATE OR REPLACE FUNCTION log_debug_mode_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO debug_mode_audit (
        type,
        environment,
        reason,
        metadata,
        severity
    ) VALUES (
        'AUTO_LOGGED',
        COALESCE(current_setting('app.environment', true), 'unknown'),
        'Automatic logging from trigger',
        jsonb_build_object(
            'trigger_name', TG_NAME,
            'operation', TG_OP,
            'table', TG_TABLE_NAME
        ),
        'info'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE debug_mode_audit IS 'Audit log for debug mode changes and security incidents';
COMMENT ON COLUMN debug_mode_audit.type IS 'Type of debug mode event';
COMMENT ON COLUMN debug_mode_audit.severity IS 'Severity level: info, warning, or critical';
COMMENT ON COLUMN debug_mode_audit.metadata IS 'Additional context and data about the event';