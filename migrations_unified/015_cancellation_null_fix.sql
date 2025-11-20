-- ============================================================================
-- UniRide Unified Migration 015: Fix Cancellation Null Handling
-- Purpose: Fix null pointer errors in cancellation tracking
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION track_ride_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    hours_before DECIMAL(8, 2);
    is_late_cancel BOOLEAN;
    cancellation_timestamp TIMESTAMPTZ;
BEGIN
    IF (NEW.status::text LIKE 'cancelled%' OR NEW.status = 'cancelled')
       AND (OLD.status::text NOT LIKE 'cancelled%' AND OLD.status != 'cancelled') THEN
        
        cancellation_timestamp := COALESCE(NEW.cancelled_at, NOW());
        
        -- Calculate hours before departure (handle null values)
        IF NEW.depart_at IS NOT NULL AND cancellation_timestamp IS NOT NULL THEN
            hours_before := EXTRACT(EPOCH FROM (NEW.depart_at - cancellation_timestamp)) / 3600.0;
            is_late_cancel := hours_before < 1.0;
        ELSE
            hours_before := NULL;
            is_late_cancel := FALSE;
        END IF;
        
        INSERT INTO public.ride_cancellations (
            ride_id, cancelled_by_uid, cancelled_by_role, cancellation_stage,
            reason_category, reason_text, ride_depart_time, hours_before_departure,
            affected_uid, cancellation_fee_applied, fee_amount
        ) VALUES (
            NEW.id, NEW.cancelled_by_uid,
            CASE WHEN NEW.cancelled_by_uid = NEW.owner_uid THEN 'rider' ELSE 'passenger' END,
            CASE 
                WHEN NEW.matched_at IS NULL THEN 'before_match'
                WHEN NEW.ride_started_at IS NULL THEN 'after_match'
                ELSE 'during_ride'
            END,
            COALESCE(NEW.cancellation_reason, 'other'), NEW.cancellation_reason,
            NEW.depart_at, hours_before,
            CASE WHEN NEW.cancelled_by_uid = NEW.owner_uid THEN NEW.passenger_uid ELSE NEW.owner_uid END,
            COALESCE(is_late_cancel, FALSE), COALESCE(NEW.cancellation_fee, 0.0)
        );
        
        IF NEW.cancelled_by_uid IS NOT NULL THEN
            IF NEW.cancelled_by_uid = NEW.owner_uid THEN
                INSERT INTO public.user_stats (user_uid, cancelled_rides_as_rider, late_cancellations_count)
                VALUES (NEW.cancelled_by_uid, 1, CASE WHEN COALESCE(is_late_cancel, FALSE) THEN 1 ELSE 0 END)
                ON CONFLICT (user_uid) DO UPDATE SET
                    cancelled_rides_as_rider = user_stats.cancelled_rides_as_rider + 1,
                    late_cancellations_count = user_stats.late_cancellations_count + CASE WHEN COALESCE(is_late_cancel, FALSE) THEN 1 ELSE 0 END,
                    updated_at = NOW();
            ELSE
                INSERT INTO public.user_stats (user_uid, cancelled_rides_as_passenger, late_cancellations_count)
                VALUES (NEW.cancelled_by_uid, 1, CASE WHEN COALESCE(is_late_cancel, FALSE) THEN 1 ELSE 0 END)
                ON CONFLICT (user_uid) DO UPDATE SET
                    cancelled_rides_as_passenger = user_stats.cancelled_rides_as_passenger + 1,
                    late_cancellations_count = user_stats.late_cancellations_count + CASE WHEN COALESCE(is_late_cancel, FALSE) THEN 1 ELSE 0 END,
                    updated_at = NOW();
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_ride_cancellation ON public.rides;
CREATE TRIGGER trigger_track_ride_cancellation
    AFTER UPDATE ON public.rides
    FOR EACH ROW
    WHEN (NEW.status::text LIKE 'cancelled%' OR NEW.status = 'cancelled')
    EXECUTE FUNCTION track_ride_cancellation();

COMMENT ON FUNCTION track_ride_cancellation() IS 'Fixed: Properly handles null values in date calculations';
