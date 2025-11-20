-- ============================================================================
-- DISABLE RLS FOR DEVELOPMENT (Temporary - FOR TESTING ONLY)
-- ============================================================================
-- ⚠️ WARNING: This disables Row Level Security on all tables
-- ⚠️ Only use this in DEVELOPMENT environment
-- ⚠️ NEVER run this in PRODUCTION
-- ============================================================================

-- Disable RLS on all main tables
ALTER TABLE public.rides DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_cancellations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log DISABLE ROW LEVEL SECURITY;

-- Verify RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Success message
SELECT '⚠️ RLS DISABLED for all tables - DEVELOPMENT MODE ONLY' AS status;

-- ============================================================================
-- TO RE-ENABLE RLS IN PRODUCTION, RUN:
-- ============================================================================
-- ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ride_transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ride_ratings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ride_cancellations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
-- ============================================================================
