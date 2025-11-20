-- ============================================================================
-- UniRide Unified Migration 010: Fix Reports for Firebase UIDs
-- Purpose: Ensure reports table uses TEXT for Firebase UIDs
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

-- Already using TEXT in migration 009, this migration ensures compatibility
-- In case reports table was created with UUID, this will fix it

DO $$
BEGIN
    -- Check if columns are UUID type and convert to TEXT if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' 
        AND column_name = 'reporter_uid' 
        AND data_type = 'uuid'
    ) THEN
        -- Drop policies before altering
        DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
        DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
        DROP POLICY IF EXISTS "Users can update their own pending reports" ON public.reports;
        
        -- Alter column types
        ALTER TABLE public.reports 
            ALTER COLUMN reporter_uid TYPE TEXT,
            ALTER COLUMN reported_user_uid TYPE TEXT;
        
        -- Recreate policies
        CREATE POLICY "Users can view their own reports" ON public.reports
            FOR SELECT USING (true);

        CREATE POLICY "Users can create reports" ON public.reports
            FOR INSERT WITH CHECK (true);

        CREATE POLICY "Users can update their own pending reports" ON public.reports
            FOR UPDATE USING (status = 'pending' AND created_at > NOW() - INTERVAL '24 hours');
    END IF;
END $$;

COMMENT ON COLUMN public.reports.reporter_uid IS 'Firebase UID of the user submitting the report (TEXT format)';
COMMENT ON COLUMN public.reports.reported_user_uid IS 'Firebase UID of the user being reported (TEXT format)';
