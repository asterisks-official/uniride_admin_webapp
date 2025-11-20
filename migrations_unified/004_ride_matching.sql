-- ============================================================================
-- UniRide Unified Migration 004: Ride Matching & Acceptance
-- Purpose: Track matched rides, ratings, and completion status
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

-- Add ride matching and acceptance fields
ALTER TABLE public.rides
ADD COLUMN IF NOT EXISTS rider_uid TEXT,  -- Firebase UID of the rider
ADD COLUMN IF NOT EXISTS passenger_uid TEXT,  -- Firebase UID of the passenger
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ,  -- When matched/accepted
ADD COLUMN IF NOT EXISTS rider_confirmed_completion BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS passenger_confirmed_completion BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rider_rating INTEGER CHECK (rider_rating >= 1 AND rider_rating <= 5),
ADD COLUMN IF NOT EXISTS passenger_rating INTEGER CHECK (passenger_rating >= 1 AND passenger_rating <= 5),
ADD COLUMN IF NOT EXISTS rider_review TEXT,
ADD COLUMN IF NOT EXISTS passenger_review TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by_uid TEXT,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Create indexes for finding active matched rides
CREATE INDEX IF NOT EXISTS idx_rides_rider_uid ON public.rides(rider_uid) WHERE status = 'active' AND matched_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rides_passenger_uid ON public.rides(passenger_uid) WHERE status = 'active' AND matched_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rides_matched_at ON public.rides(matched_at) WHERE matched_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.rides.rider_uid IS 'Firebase UID of the rider in this matched ride';
COMMENT ON COLUMN public.rides.passenger_uid IS 'Firebase UID of the passenger in this matched ride';
COMMENT ON COLUMN public.rides.matched_at IS 'Timestamp when the ride was accepted and matched';
COMMENT ON COLUMN public.rides.rider_confirmed_completion IS 'Rider confirmed ride completion';
COMMENT ON COLUMN public.rides.passenger_confirmed_completion IS 'Passenger confirmed ride completion';
