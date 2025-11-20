-- ============================================================================
-- UniRide Unified Migration 009: Reports Table
-- Purpose: User reports and safety concerns
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_uid TEXT NOT NULL,
    reported_user_uid TEXT,
    ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Rider Safety Concern', 'Inappropriate Behavior', 'Vehicle Issues',
        'Route/Navigation Problem', 'Payment Issue', 'App Technical Issue',
        'Passenger No-Show', 'Safety Concern', 'Damage to Vehicle', 'Other'
    )),
    severity TEXT NOT NULL CHECK (severity IN (
        'Low - Minor inconvenience', 'Medium - Moderate concern', 
        'High - Serious issue', 'Critical - Safety concern'
    )),
    description TEXT NOT NULL,
    reporter_role TEXT NOT NULL CHECK (reporter_role IN ('rider', 'passenger')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_uid ON public.reports(reporter_uid);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_uid ON public.reports(reported_user_uid);
CREATE INDEX IF NOT EXISTS idx_reports_ride_id ON public.reports(ride_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_severity ON public.reports(severity);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at);

CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_updated_at();

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports" ON public.reports
    FOR SELECT USING (true);

CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own pending reports" ON public.reports
    FOR UPDATE USING (status = 'pending' AND created_at > NOW() - INTERVAL '24 hours');

GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;

COMMENT ON TABLE public.reports IS 'User reports for safety concerns, issues, and violations';
