-- ============================================================================
-- UniRide Unified Migration 003: Ride Features (Type & Flexibility)
-- Purpose: Add ride type (offer/request) and flexibility minutes
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

-- Create enum type for ride type
CREATE TYPE ride_type AS ENUM ('offer', 'request');

-- Add type column to rides table
ALTER TABLE public.rides 
ADD COLUMN type ride_type NOT NULL DEFAULT 'offer';

-- Add flexibility_minutes column
ALTER TABLE public.rides 
ADD COLUMN flexibility_minutes INTEGER DEFAULT 0 CHECK (flexibility_minutes >= 0);

-- Create indexes for filtering
CREATE INDEX idx_rides_type ON public.rides(type);
CREATE INDEX idx_rides_flexibility ON public.rides(flexibility_minutes);

-- Update existing rides to have default values
UPDATE public.rides 
SET type = 'offer', flexibility_minutes = 0
WHERE type IS NULL OR flexibility_minutes IS NULL;

-- Make flexibility NOT NULL after setting defaults
ALTER TABLE public.rides 
ALTER COLUMN flexibility_minutes SET NOT NULL;

-- Add comments
COMMENT ON COLUMN public.rides.type IS 'Type of ride: offer (posted by rider) or request (posted by passenger)';
COMMENT ON COLUMN public.rides.flexibility_minutes IS 'Minutes passenger/rider willing to wait for pickup (0 = instant, 5 = +5 min, etc.)';
