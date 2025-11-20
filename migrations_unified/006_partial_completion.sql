-- ============================================================================
-- UniRide Unified Migration 006: Partial Completion Support
-- Purpose: Add 'partially_completed' status for one-party confirmation
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'partially_completed' AND enumtypid = 'ride_status'::regtype) THEN
        ALTER TYPE ride_status ADD VALUE 'partially_completed';
    END IF;
END $$;

COMMENT ON TYPE ride_status IS 'Ride status including partially_completed when only one party has confirmed completion';
