-- ============================================================================
-- UniRide Unified Migration 017: Users Profiles Table
-- Purpose: Migrate user profile data from Firebase Firestore to Supabase
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    uid TEXT PRIMARY KEY,  -- Firebase UID (matches auth.users in Supabase Auth)
    
    -- Basic Profile Information
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('rider', 'passenger')),
    
    -- Profile Images
    profile_image_url TEXT,
    bike_image_url TEXT,
    
    -- Verification Status
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_rider_verified BOOLEAN,
    rider_verification_status TEXT CHECK (rider_verification_status IN ('unsubmitted', 'pending', 'approved', 'rejected')),
    verification_rejection_reason TEXT,
    verification_submitted_at TIMESTAMPTZ,
    verification_reviewed_at TIMESTAMPTZ,
    verification_reviewed_by TEXT,  -- Admin UID who reviewed
    
    -- Vehicle Information (for riders)
    bike_model TEXT,
    vehicle_number TEXT,
    vehicle_type TEXT,  -- 'bike', 'car', 'scooter', etc.
    vehicle_color TEXT,
    
    -- Statistics (cached from user_stats for quick access)
    total_rides INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.0 CHECK (average_rating >= 0 AND average_rating <= 5),
    
    -- OneSignal Push Notifications
    onesignal_player_id TEXT,
    onesignal_subscription_id TEXT,
    push_notifications_enabled BOOLEAN DEFAULT TRUE,
    
    -- Account Status
    is_active BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    suspended_at TIMESTAMPTZ,
    suspended_by TEXT,  -- Admin UID who suspended
    suspended_until TIMESTAMPTZ,
    
    -- Privacy Settings
    show_phone_to_matched BOOLEAN DEFAULT TRUE,
    show_full_name BOOLEAN DEFAULT TRUE,
    
    -- Additional Profile Data
    bio TEXT,
    university TEXT,
    department TEXT,
    graduation_year INTEGER,
    preferences JSONB DEFAULT '{}'::jsonb,  -- User preferences as JSON
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON public.users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON public.users(rider_verification_status) WHERE rider_verification_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_users_suspended ON public.users(is_suspended) WHERE is_suspended = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_onesignal ON public.users(onesignal_player_id) WHERE onesignal_player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_active ON public.users(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- ============================================================================
-- PART 3: CREATE UPDATED_AT TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 4: SYNC FUNCTION TO UPDATE USER STATS CACHE
-- ============================================================================

-- Function to sync cached stats from user_stats to users table
CREATE OR REPLACE FUNCTION sync_user_stats_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the cached stats in users table
    UPDATE public.users
    SET 
        total_rides = COALESCE(NEW.total_rides_as_rider, 0) + COALESCE(NEW.total_rides_as_passenger, 0),
        average_rating = CASE 
            WHEN (COALESCE(NEW.total_ratings_received_as_rider, 0) + COALESCE(NEW.total_ratings_received_as_passenger, 0)) > 0 
            THEN (
                (COALESCE(NEW.average_rating_as_rider, 0) * COALESCE(NEW.total_ratings_received_as_rider, 0)) + 
                (COALESCE(NEW.average_rating_as_passenger, 0) * COALESCE(NEW.total_ratings_received_as_passenger, 0))
            ) / (COALESCE(NEW.total_ratings_received_as_rider, 0) + COALESCE(NEW.total_ratings_received_as_passenger, 0))
            ELSE 0
        END
    WHERE uid = NEW.user_uid;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_stats table
DROP TRIGGER IF EXISTS trigger_sync_user_stats_to_profile ON public.user_stats;
CREATE TRIGGER trigger_sync_user_stats_to_profile
    AFTER INSERT OR UPDATE ON public.user_stats
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_stats_to_profile();

-- ============================================================================
-- PART 5: ADD FOREIGN KEY REFERENCES TO EXISTING TABLES
-- ============================================================================

-- Note: We intentionally DON'T add foreign key constraints from rides/requests to users
-- because Firebase UIDs are stored as TEXT and we want to maintain flexibility
-- However, we add indexes for performance

-- Ensure user_stats references users (optional, for data integrity)
-- Uncomment if you want strict referential integrity:
-- ALTER TABLE public.user_stats 
--     ADD CONSTRAINT fk_user_stats_user 
--     FOREIGN KEY (user_uid) REFERENCES public.users(uid) ON DELETE CASCADE;

-- ============================================================================
-- PART 6: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get user profile by UID
CREATE OR REPLACE FUNCTION get_user_profile(user_uid TEXT)
RETURNS TABLE (
    uid TEXT,
    email TEXT,
    name TEXT,
    role TEXT,
    profile_image_url TEXT,
    average_rating DECIMAL,
    total_rides INTEGER,
    is_rider_verified BOOLEAN,
    is_suspended BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.uid,
        u.email,
        u.name,
        u.role,
        u.profile_image_url,
        u.average_rating,
        u.total_rides,
        u.is_rider_verified,
        u.is_suspended
    FROM public.users u
    WHERE u.uid = user_uid AND u.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to search users by name or email (for admin)
CREATE OR REPLACE FUNCTION search_users(search_term TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    uid TEXT,
    email TEXT,
    name TEXT,
    role TEXT,
    student_id TEXT,
    is_suspended BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.uid,
        u.email,
        u.name,
        u.role,
        u.student_id,
        u.is_suspended,
        u.created_at
    FROM public.users u
    WHERE 
        u.name ILIKE '%' || search_term || '%' OR
        u.email ILIKE '%' || search_term || '%' OR
        u.student_id ILIKE '%' || search_term || '%'
    ORDER BY u.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update last active timestamp
CREATE OR REPLACE FUNCTION update_user_last_active(user_uid TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.users
    SET last_active_at = NOW()
    WHERE uid = user_uid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 7: CREATE VIEW FOR COMPLETE USER PROFILE
-- ============================================================================

-- View that combines users table with user_stats for complete profile
CREATE OR REPLACE VIEW user_profiles_complete AS
SELECT 
    u.*,
    us.completed_rides_as_rider,
    us.completed_rides_as_passenger,
    us.total_rides_as_rider,
    us.total_rides_as_passenger,
    us.cancelled_rides_as_rider,
    us.cancelled_rides_as_passenger,
    us.average_rating_as_rider,
    us.average_rating_as_passenger,
    us.total_ratings_received_as_rider,
    us.total_ratings_received_as_passenger,
    us.total_earnings,
    us.pending_earnings,
    us.withdrawn_earnings,
    us.total_spent,
    us.trust_score,
    us.cancellation_rate_as_rider,
    us.cancellation_rate_as_passenger,
    us.no_show_count,
    us.late_cancellations_count,
    us.is_verified,
    us.first_ride_at,
    us.last_ride_at
FROM public.users u
LEFT JOIN public.user_stats us ON u.uid = us.user_uid;

-- ============================================================================
-- PART 8: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.users IS 'User profiles migrated from Firebase Firestore';
COMMENT ON COLUMN public.users.uid IS 'Firebase Authentication UID (primary key)';
COMMENT ON COLUMN public.users.rider_verification_status IS 'Rider verification workflow status';
COMMENT ON COLUMN public.users.onesignal_player_id IS 'OneSignal player ID for push notifications';
COMMENT ON COLUMN public.users.preferences IS 'User preferences stored as JSONB';
COMMENT ON COLUMN public.users.metadata IS 'Additional metadata stored as JSONB';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify the table was created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ Users table created successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to create users table';
    END IF;
END $$;
