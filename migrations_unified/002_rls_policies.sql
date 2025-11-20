-- ============================================================================
-- UniRide Unified Migration 002: Row Level Security Policies
-- Purpose: Security policies for Firebase + Supabase hybrid architecture
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

-- Helper function to get Firebase UID from JWT
CREATE OR REPLACE FUNCTION get_firebase_uid()
RETURNS TEXT AS $$
BEGIN
    -- Get the 'sub' claim from the JWT token
    -- Firebase tokens have the user's UID in the 'sub' claim
    RETURN current_setting('request.jwt.claims', true)::json->>'sub';
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user role from JWT claims
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    -- Firebase custom claims can include role
    RETURN current_setting('request.jwt.claims', true)::json->>'role';
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RIDES TABLE POLICIES
-- ============================================

-- Anyone (authenticated) can view active, visible rides
CREATE POLICY "Anyone can view active rides"
    ON public.rides FOR SELECT
    USING (
        get_firebase_uid() IS NOT NULL
        AND (
            (status = 'active' AND visible = true)
            OR owner_uid = get_firebase_uid()
        )
    );

-- Authenticated users can create rides
CREATE POLICY "Authenticated users can create rides"
    ON public.rides FOR INSERT
    WITH CHECK (
        get_firebase_uid() IS NOT NULL
        AND owner_uid = get_firebase_uid()
    );

-- Owners can update their own rides
CREATE POLICY "Owners can update own rides"
    ON public.rides FOR UPDATE
    USING (
        get_firebase_uid() IS NOT NULL
        AND owner_uid = get_firebase_uid()
    );

-- Owners can delete their own rides
CREATE POLICY "Owners can delete own rides"
    ON public.rides FOR DELETE
    USING (
        get_firebase_uid() IS NOT NULL
        AND owner_uid = get_firebase_uid()
    );

-- ============================================
-- RIDE REQUESTS TABLE POLICIES
-- ============================================

-- Passengers can view their own requests
-- Ride owners can view requests for their rides
CREATE POLICY "Users can view relevant requests"
    ON public.ride_requests FOR SELECT
    USING (
        get_firebase_uid() IS NOT NULL
        AND (
            passenger_uid = get_firebase_uid()
            OR EXISTS (
                SELECT 1 FROM public.rides
                WHERE rides.id = ride_requests.ride_id
                AND rides.owner_uid = get_firebase_uid()
            )
        )
    );

-- Authenticated users can create requests
CREATE POLICY "Authenticated users can create requests"
    ON public.ride_requests FOR INSERT
    WITH CHECK (
        get_firebase_uid() IS NOT NULL
        AND passenger_uid = get_firebase_uid()
        -- Prevent requesting own ride
        AND NOT EXISTS (
            SELECT 1 FROM public.rides
            WHERE rides.id = ride_requests.ride_id
            AND rides.owner_uid = get_firebase_uid()
        )
    );

-- Passengers can cancel their own pending requests
-- Ride owners can accept/decline requests for their rides
CREATE POLICY "Users can update relevant requests"
    ON public.ride_requests FOR UPDATE
    USING (
        get_firebase_uid() IS NOT NULL
        AND (
            (passenger_uid = get_firebase_uid() AND status = 'pending')
            OR EXISTS (
                SELECT 1 FROM public.rides
                WHERE rides.id = ride_requests.ride_id
                AND rides.owner_uid = get_firebase_uid()
            )
        )
    );

-- Passengers can delete their own requests
CREATE POLICY "Passengers can delete own requests"
    ON public.ride_requests FOR DELETE
    USING (
        get_firebase_uid() IS NOT NULL
        AND passenger_uid = get_firebase_uid()
    );

-- ============================================
-- DEVELOPMENT MODE: DISABLE RLS (OPTIONAL)
-- ============================================
-- Uncomment the following lines for easier development testing
-- WARNING: Re-enable RLS in production!

-- ALTER TABLE public.rides DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ride_requests DISABLE ROW LEVEL SECURITY;

COMMENT ON FUNCTION get_firebase_uid IS 'Extract Firebase UID from JWT token for RLS policies';
COMMENT ON FUNCTION get_user_role IS 'Extract user role from JWT custom claims';
