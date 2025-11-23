-- ============================================================================
-- UniRide Unified Migration 018: Row Level Security for Users Table
-- Purpose: Secure user profile access with RLS policies
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

-- ============================================================================
-- PART 1: DISABLE RLS ON USERS TABLE (TEMPORARILY FOR DEVELOPMENT)
-- ============================================================================

-- Note: RLS is disabled to allow unrestricted access during development
-- Enable RLS in production by running: ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: HELPER FUNCTION TO GET FIREBASE UID FROM JWT
-- ============================================================================

-- This function extracts the Firebase UID from the Supabase JWT token
-- Assumes the Firebase UID is stored in the JWT claims
CREATE OR REPLACE FUNCTION get_firebase_uid()
RETURNS TEXT AS $$
BEGIN
    -- Try to get Firebase UID from JWT claims
    -- Format: auth.uid() returns Supabase auth user ID
    -- For Firebase hybrid: we store firebase_uid in user metadata
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->>'firebase_uid',
        auth.uid()::text
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN auth.uid()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 3: USER POLICIES
-- ============================================================================

-- Policy: Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT
    USING (uid = get_firebase_uid());

-- Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE
    USING (uid = get_firebase_uid())
    WITH CHECK (uid = get_firebase_uid());

-- Policy: New users can insert their own profile (for signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT
    WITH CHECK (uid = get_firebase_uid());

-- Policy: Users can view profiles of people they have rides with
DROP POLICY IF EXISTS "Users can view matched user profiles" ON public.users;
CREATE POLICY "Users can view matched user profiles" ON public.users
    FOR SELECT
    USING (
        uid IN (
            -- Users who are riders in my rides
            SELECT DISTINCT rider_uid FROM public.rides 
            WHERE passenger_uid = get_firebase_uid() OR owner_uid = get_firebase_uid()
            UNION
            -- Users who are passengers in my rides
            SELECT DISTINCT passenger_uid FROM public.rides 
            WHERE rider_uid = get_firebase_uid() OR owner_uid = get_firebase_uid()
            UNION
            -- Users who created rides I requested
            SELECT DISTINCT owner_uid FROM public.rides r
            INNER JOIN public.ride_requests rr ON r.id = rr.ride_id
            WHERE rr.passenger_uid = get_firebase_uid()
            UNION
            -- Users who requested my rides
            SELECT DISTINCT rr.passenger_uid FROM public.ride_requests rr
            INNER JOIN public.rides r ON r.id = rr.ride_id
            WHERE r.owner_uid = get_firebase_uid()
        )
    );

-- Policy: Users can view public profile info of active users
DROP POLICY IF EXISTS "Users can view active user public profiles" ON public.users;
CREATE POLICY "Users can view active user public profiles" ON public.users
    FOR SELECT
    USING (
        is_active = TRUE 
        AND is_suspended = FALSE
    );

-- ============================================================================
-- PART 4: ADMIN POLICIES
-- ============================================================================

-- Policy: Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles" ON public.users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.uid = get_firebase_uid() 
            AND u.role = 'admin'
        )
    );

-- Policy: Admins can update any profile (for moderation)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.users;
CREATE POLICY "Admins can update any profile" ON public.users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.uid = get_firebase_uid() 
            AND u.role = 'admin'
        )
    );

-- Policy: Admins can suspend users
DROP POLICY IF EXISTS "Admins can suspend users" ON public.users;
CREATE POLICY "Admins can suspend users" ON public.users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.uid = get_firebase_uid() 
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.uid = get_firebase_uid() 
            AND u.role = 'admin'
        )
    );

-- ============================================================================
-- PART 5: FUNCTION TO CHECK IF USER IS ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE uid = get_firebase_uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 6: SENSITIVE DATA PROTECTION
-- ============================================================================

-- Create a view that hides sensitive information for non-matched users
CREATE OR REPLACE VIEW users_public_view AS
SELECT 
    uid,
    name,
    role,
    profile_image_url,
    average_rating,
    total_rides,
    is_rider_verified,
    bio,
    university,
    department,
    CASE 
        WHEN role = 'rider' THEN vehicle_type
        ELSE NULL
    END as vehicle_type,
    created_at
FROM public.users
WHERE is_active = TRUE AND is_suspended = FALSE;

-- Grant access to the public view
GRANT SELECT ON users_public_view TO authenticated;
GRANT SELECT ON users_public_view TO anon;

-- ============================================================================
-- PART 7: AUDIT TRIGGER FOR PROFILE CHANGES
-- ============================================================================

-- Function to log important profile changes
CREATE OR REPLACE FUNCTION log_user_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log suspension changes
    IF OLD.is_suspended IS DISTINCT FROM NEW.is_suspended THEN
        INSERT INTO public.admin_audit_log (
            admin_uid,
            action_type,
            target_type,
            target_id,
            old_value,
            new_value,
            reason
        ) VALUES (
            get_firebase_uid(),
            CASE WHEN NEW.is_suspended THEN 'suspend_user' ELSE 'unsuspend_user' END,
            'user',
            NEW.uid,
            OLD.is_suspended::text,
            NEW.is_suspended::text,
            NEW.suspension_reason
        );
    END IF;
    
    -- Log verification status changes
    IF OLD.rider_verification_status IS DISTINCT FROM NEW.rider_verification_status THEN
        INSERT INTO public.admin_audit_log (
            admin_uid,
            action_type,
            target_type,
            target_id,
            old_value,
            new_value,
            reason
        ) VALUES (
            get_firebase_uid(),
            'verify_rider',
            'user',
            NEW.uid,
            OLD.rider_verification_status,
            NEW.rider_verification_status,
            NEW.verification_rejection_reason
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger
DROP TRIGGER IF EXISTS trigger_log_user_profile_changes ON public.users;
CREATE TRIGGER trigger_log_user_profile_changes
    AFTER UPDATE ON public.users
    FOR EACH ROW
    WHEN (
        OLD.is_suspended IS DISTINCT FROM NEW.is_suspended OR
        OLD.rider_verification_status IS DISTINCT FROM NEW.rider_verification_status
    )
    EXECUTE FUNCTION log_user_profile_changes();

-- ============================================================================
-- PART 8: VERIFICATION WORKFLOW FUNCTIONS
-- ============================================================================

-- Function for admins to approve rider verification
CREATE OR REPLACE FUNCTION approve_rider_verification(
    target_uid TEXT,
    admin_uid TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Check if caller is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can approve rider verification';
    END IF;
    
    UPDATE public.users
    SET 
        rider_verification_status = 'approved',
        is_rider_verified = TRUE,
        verification_reviewed_at = NOW(),
        verification_reviewed_by = admin_uid
    WHERE uid = target_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for admins to reject rider verification
CREATE OR REPLACE FUNCTION reject_rider_verification(
    target_uid TEXT,
    admin_uid TEXT,
    rejection_reason TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Check if caller is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can reject rider verification';
    END IF;
    
    UPDATE public.users
    SET 
        rider_verification_status = 'rejected',
        is_rider_verified = FALSE,
        verification_rejection_reason = rejection_reason,
        verification_reviewed_at = NOW(),
        verification_reviewed_by = admin_uid
    WHERE uid = target_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies for users table created successfully';
END $$;
