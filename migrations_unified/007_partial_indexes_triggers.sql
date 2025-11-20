-- ============================================================================
-- UniRide Unified Migration 007: Partial Completion Indexes & Triggers
-- Purpose: Add indexes and auto-update triggers for partial completion
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

-- Add indexes for efficient querying of partially completed rides
CREATE INDEX IF NOT EXISTS idx_rides_partially_completed ON public.rides(status) WHERE status = 'partially_completed';
CREATE INDEX IF NOT EXISTS idx_rides_completion_status ON public.rides(rider_confirmed_completion, passenger_confirmed_completion) WHERE status IN ('ongoing', 'partially_completed');

-- Auto-update ride status based on completion confirmations
CREATE OR REPLACE FUNCTION update_ride_completion_status()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.rider_confirmed_completion IS DISTINCT FROM NEW.rider_confirmed_completion) OR 
       (OLD.passenger_confirmed_completion IS DISTINCT FROM NEW.passenger_confirmed_completion) THEN
        
        IF NEW.rider_confirmed_completion = TRUE AND NEW.passenger_confirmed_completion = TRUE THEN
            NEW.status = 'completed';
            NEW.completed_at = COALESCE(NEW.completed_at, NOW());
            NEW.completion_verified_at = NOW();
        ELSIF (NEW.rider_confirmed_completion = TRUE OR NEW.passenger_confirmed_completion = TRUE) AND 
              NEW.status NOT IN ('completed', 'partially_completed') THEN
            NEW.status = 'partially_completed';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ride_completion_status ON public.rides;
CREATE TRIGGER trigger_update_ride_completion_status
    BEFORE UPDATE ON public.rides
    FOR EACH ROW
    EXECUTE FUNCTION update_ride_completion_status();

COMMENT ON FUNCTION update_ride_completion_status() IS 'Auto-updates ride status to partially_completed when one user confirms, completed when both confirm';
