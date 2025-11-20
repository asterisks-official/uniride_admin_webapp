-- ============================================================================
-- UniRide Unified Migration 013: Add Rating Received Notification
-- Purpose: Add rating_received notification type
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type') 
        AND enumlabel = 'rating_received'
    ) THEN
        ALTER TYPE notification_type ADD VALUE 'rating_received';
    END IF;
END $$;

COMMENT ON TYPE notification_type IS 'Notification types including rating_received for when users receive ratings';
