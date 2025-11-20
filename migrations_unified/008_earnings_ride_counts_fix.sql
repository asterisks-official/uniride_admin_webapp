-- ============================================================================
-- UniRide Unified Migration 008: Fix Earnings and Ride Counts (CRITICAL)
-- Purpose: Fix earnings going to wrong user and incorrect ride count tracking
-- Issues Fixed:
--   - Earnings now go to rider_uid (actual rider), not owner_uid
--   - Ride counts now correctly track rider_uid and passenger_uid
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

-- Fix earnings function to add money to the actual rider
CREATE OR REPLACE FUNCTION update_earnings_on_ride_complete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.earnings > 0 THEN
        IF NEW.rider_uid IS NOT NULL THEN
            INSERT INTO public.user_stats (user_uid, total_earnings, pending_earnings)
            VALUES (NEW.rider_uid, NEW.earnings, NEW.earnings)
            ON CONFLICT (user_uid) DO UPDATE SET
                total_earnings = user_stats.total_earnings + NEW.earnings,
                pending_earnings = user_stats.pending_earnings + NEW.earnings,
                updated_at = NOW();
                
            RAISE NOTICE 'Added earnings of % to rider %', NEW.earnings, NEW.rider_uid;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix ride stats function to correctly count rides based on actual roles
CREATE OR REPLACE FUNCTION update_user_stats_on_ride_complete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        
        -- Update rider stats (person who provided the ride)
        IF NEW.rider_uid IS NOT NULL THEN
            INSERT INTO public.user_stats (user_uid, completed_rides_as_rider, total_rides_as_rider, last_ride_at)
            VALUES (NEW.rider_uid, 1, 1, NEW.completed_at)
            ON CONFLICT (user_uid) DO UPDATE SET
                completed_rides_as_rider = user_stats.completed_rides_as_rider + 1,
                total_rides_as_rider = user_stats.total_rides_as_rider + 1,
                last_ride_at = NEW.completed_at,
                updated_at = NOW();
                
            RAISE NOTICE 'Updated rider stats for user %', NEW.rider_uid;
        END IF;
        
        -- Update passenger stats (person who took the ride)
        IF NEW.passenger_uid IS NOT NULL THEN
            INSERT INTO public.user_stats (user_uid, completed_rides_as_passenger, total_rides_as_passenger, last_ride_at)
            VALUES (NEW.passenger_uid, 1, 1, NEW.completed_at)
            ON CONFLICT (user_uid) DO UPDATE SET
                completed_rides_as_passenger = user_stats.completed_rides_as_passenger + 1,
                total_rides_as_passenger = user_stats.total_rides_as_passenger + 1,
                last_ride_at = NEW.completed_at,
                updated_at = NOW();
                
            RAISE NOTICE 'Updated passenger stats for user %', NEW.passenger_uid;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers with fixed functions
DROP TRIGGER IF EXISTS trigger_update_earnings_on_complete ON public.rides;
CREATE TRIGGER trigger_update_earnings_on_complete
    AFTER UPDATE ON public.rides
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION update_earnings_on_ride_complete();

DROP TRIGGER IF EXISTS trigger_update_user_stats_on_complete ON public.rides;
CREATE TRIGGER trigger_update_user_stats_on_complete
    AFTER UPDATE ON public.rides
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION update_user_stats_on_ride_complete();

COMMENT ON FUNCTION update_earnings_on_ride_complete() IS 'Fixed: Adds earnings to rider_uid (actual rider) instead of owner_uid';
COMMENT ON FUNCTION update_user_stats_on_ride_complete() IS 'Fixed: Correctly counts rides based on rider_uid and passenger_uid roles';
