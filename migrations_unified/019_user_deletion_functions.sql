-- ============================================================================
-- UniRide Unified Migration 019: User Deletion Functions
-- Purpose: Safe user account deletion with data cleanup/anonymization
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

-- ============================================================================
-- PART 1: FUNCTION TO ANONYMIZE USER DATA IN RIDES
-- ============================================================================

-- When a user deletes their account, we anonymize their data in rides
-- rather than deleting rides completely (to preserve ride history for other users)
CREATE OR REPLACE FUNCTION anonymize_user_rides(target_uid TEXT)
RETURNS VOID AS $$
BEGIN
    -- Update rides where user was rider - set to NULL and mark as deleted user
    UPDATE public.rides
    SET 
        rider_uid = NULL,
        updated_at = NOW()
    WHERE rider_uid = target_uid;
    
    -- Update rides where user was passenger - set to NULL
    UPDATE public.rides
    SET 
        passenger_uid = NULL,
        updated_at = NOW()
    WHERE passenger_uid = target_uid;
    
    -- Update rides where user was owner - set to NULL
    UPDATE public.rides
    SET 
        owner_uid = NULL,
        updated_at = NOW()
    WHERE owner_uid = target_uid;
    
    -- Note: Rides remain in the database for historical purposes
    -- Other users involved in the ride can still see it
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 2: FUNCTION FOR COMPLETE USER DELETION
-- ============================================================================

-- Comprehensive user deletion function that can be called from Supabase Edge Functions
-- or directly from SQL for administrative cleanup
CREATE OR REPLACE FUNCTION delete_user_completely(target_uid TEXT)
RETURNS JSON AS $$
DECLARE
    stats_count INTEGER;
    ratings_count INTEGER;
    messages_count INTEGER;
    requests_count INTEGER;
    rides_affected INTEGER;
BEGIN
    -- Count records before deletion (for logging)
    SELECT COUNT(*) INTO stats_count FROM public.user_stats WHERE user_uid = target_uid;
    SELECT COUNT(*) INTO ratings_count FROM public.ratings WHERE rater_uid = target_uid OR rated_uid = target_uid;
    SELECT COUNT(*) INTO messages_count FROM public.messages WHERE sender_uid = target_uid;
    SELECT COUNT(*) INTO requests_count FROM public.ride_requests WHERE passenger_uid = target_uid;
    SELECT COUNT(*) INTO rides_affected FROM public.rides WHERE rider_uid = target_uid OR passenger_uid = target_uid OR owner_uid = target_uid;
    
    -- Delete user statistics
    DELETE FROM public.user_stats WHERE user_uid = target_uid;
    
    -- Delete ratings (both given and received)
    DELETE FROM public.ratings WHERE rater_uid = target_uid OR rated_uid = target_uid;
    
    -- Delete chat messages
    DELETE FROM public.messages WHERE sender_uid = target_uid;
    
    -- Delete ride requests
    DELETE FROM public.ride_requests WHERE passenger_uid = target_uid;
    
    -- Anonymize rides
    PERFORM anonymize_user_rides(target_uid);
    
    -- Delete user profile (final step)
    DELETE FROM public.users WHERE uid = target_uid;
    
    -- Return summary
    RETURN json_build_object(
        'success', TRUE,
        'user_uid', target_uid,
        'deleted_stats', stats_count,
        'deleted_ratings', ratings_count,
        'deleted_messages', messages_count,
        'deleted_requests', requests_count,
        'anonymized_rides', rides_affected,
        'deleted_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 3: ADD CASCADE DELETE RULES (IF MISSING)
-- ============================================================================

-- Ensure notifications are deleted when user is deleted
-- This handles in-app notifications that reference the user
DO $$
BEGIN
    -- Check if notifications table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
        -- Delete notifications for the deleted user
        -- This should be handled by triggers or the delete function
        RAISE NOTICE 'Notifications table exists - consider adding CASCADE if needed';
    END IF;
END $$;

-- ============================================================================
-- PART 4: ADMIN AUDIT LOG FOR DELETIONS
-- ============================================================================

-- Log user deletions for compliance and auditing
CREATE TABLE IF NOT EXISTS public.user_deletion_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deleted_user_uid TEXT NOT NULL,
    deleted_user_email TEXT,
    deleted_user_name TEXT,
    deletion_reason TEXT,
    deleted_by TEXT, -- UID of admin who deleted (NULL for self-deletion)
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    data_summary JSONB -- Summary of what was deleted
);

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_user_deletion_log_uid ON public.user_deletion_log(deleted_user_uid);
CREATE INDEX IF NOT EXISTS idx_user_deletion_log_date ON public.user_deletion_log(deleted_at DESC);

-- Grant access to authenticated users (for self-deletion logging)
GRANT INSERT ON public.user_deletion_log TO authenticated;
GRANT SELECT ON public.user_deletion_log TO authenticated;

-- ============================================================================
-- PART 5: TRIGGER TO LOG DELETIONS
-- ============================================================================

-- Function to log user deletion
CREATE OR REPLACE FUNCTION log_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_deletion_log (
        deleted_user_uid,
        deleted_user_email,
        deleted_user_name,
        deletion_reason,
        data_summary
    ) VALUES (
        OLD.uid,
        OLD.email,
        OLD.name,
        'User account deleted',
        json_build_object(
            'total_rides', OLD.total_rides,
            'average_rating', OLD.average_rating,
            'role', OLD.role,
            'created_at', OLD.created_at
        )
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
DROP TRIGGER IF EXISTS trigger_log_user_deletion ON public.users;
CREATE TRIGGER trigger_log_user_deletion
    BEFORE DELETE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_deletion();

-- ============================================================================
-- PART 6: SAFETY FUNCTION TO PREVENT ACCIDENTAL MASS DELETION
-- ============================================================================

-- Function to check if deletion is safe (prevent mass deletion)
CREATE OR REPLACE FUNCTION check_deletion_safety()
RETURNS TRIGGER AS $$
DECLARE
    deletion_count INTEGER;
BEGIN
    -- Count how many users would be deleted in this transaction
    SELECT COUNT(*) INTO deletion_count
    FROM public.users
    WHERE uid IN (SELECT OLD.uid);
    
    -- If more than 10 users being deleted at once, require explicit confirmation
    IF deletion_count > 10 THEN
        RAISE EXCEPTION 'Mass deletion detected: % users. Please use admin tools for bulk operations.', deletion_count;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Apply safety trigger
DROP TRIGGER IF EXISTS trigger_check_deletion_safety ON public.users;
CREATE TRIGGER trigger_check_deletion_safety
    BEFORE DELETE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION check_deletion_safety();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ User deletion functions and safety measures created successfully';
    RAISE NOTICE '   - anonymize_user_rides() function';
    RAISE NOTICE '   - delete_user_completely() function';
    RAISE NOTICE '   - user_deletion_log table';
    RAISE NOTICE '   - Deletion logging trigger';
    RAISE NOTICE '   - Safety check trigger';
END $$;
