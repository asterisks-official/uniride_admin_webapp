-- ============================================================================
-- UniRide Unified Migration 014: Admin Audit Log
-- Purpose: Track all administrative actions for compliance and auditing
-- Compatible with: Admin Dashboard
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_uid TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    diff JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE admin_audit_log IS 'Immutable audit log of all administrative actions';
COMMENT ON COLUMN admin_audit_log.admin_uid IS 'Firebase UID of the administrator';
COMMENT ON COLUMN admin_audit_log.action IS 'Action performed (e.g., verify_rider, ban_user, cancel_ride)';
COMMENT ON COLUMN admin_audit_log.entity_type IS 'Type of entity affected (e.g., user, ride, report)';
COMMENT ON COLUMN admin_audit_log.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN admin_audit_log.diff IS 'JSON object with before/after state';

-- Enable RLS
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "Service role can insert audit logs" ON admin_audit_log
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can read audit logs" ON admin_audit_log
    FOR SELECT TO service_role USING (true);

-- Grant permissions
GRANT SELECT, INSERT ON admin_audit_log TO service_role;

COMMENT ON TABLE admin_audit_log IS 'Admin action audit trail for compliance and security';
