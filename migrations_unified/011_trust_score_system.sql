-- ============================================================================
-- UniRide Unified Migration 011: Trust Score Calculation System
-- Purpose: Automated trust score calculation (0-100) based on user behavior
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

-- Trust Score Formula:
-- 1. Rating Score (0-30): avg_rating × 6 (or 15 for new users)
-- 2. Completion Rate (0-25): (completed/total) × 25 (or 20 for new users)
-- 3. Reliability (0-25): 25 - (cancellations×2) - (late_cancellations×5) - (no_shows×10)
-- 4. Experience Bonus (0-20): 10 for new, 20 for 10+ rides, scaled between

CREATE OR REPLACE FUNCTION calculate_trust_score(
    avg_rating DECIMAL,
    total_ratings_count INTEGER,
    total_rides INTEGER,
    completed_rides INTEGER,
    cancelled_rides INTEGER,
    late_cancellations INTEGER,
    no_shows INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    rating_score DECIMAL := 0;
    completion_score DECIMAL := 0;
    reliability_score DECIMAL := 25;
    experience_bonus DECIMAL := 0;
    final_score DECIMAL := 0;
BEGIN
    -- Rating Score (0-30)
    IF total_ratings_count > 0 THEN
        rating_score := LEAST(avg_rating * 6, 30);
    ELSE
        rating_score := 15;
    END IF;

    -- Completion Rate (0-25)
    IF total_rides > 0 THEN
        completion_score := (completed_rides::DECIMAL / total_rides::DECIMAL) * 25;
    ELSE
        completion_score := 20;
    END IF;

    -- Reliability Score (0-25)
    reliability_score := 25 - (cancelled_rides * 2) - (late_cancellations * 5) - (no_shows * 10);
    reliability_score := GREATEST(reliability_score, 0);

    -- Experience Bonus (0-20)
    IF total_rides = 0 THEN
        experience_bonus := 10;
    ELSIF total_rides >= 10 THEN
        experience_bonus := 20;
    ELSE
        experience_bonus := 10 + total_rides;
    END IF;

    final_score := rating_score + completion_score + reliability_score + experience_bonus;
    final_score := LEAST(GREATEST(final_score, 0), 100);
    
    RETURN ROUND(final_score)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update user trust score
CREATE OR REPLACE FUNCTION update_user_trust_score(p_user_uid TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_avg_rating DECIMAL;
    v_total_ratings INTEGER;
    v_total_rides INTEGER;
    v_completed_rides INTEGER;
    v_cancelled_rides INTEGER;
    v_late_cancellations INTEGER;
    v_no_shows INTEGER;
    v_new_trust_score INTEGER;
BEGIN
    SELECT 
        CASE 
            WHEN (total_ratings_received_as_rider + total_ratings_received_as_passenger) > 0 
            THEN ((average_rating_as_rider * total_ratings_received_as_rider + 
                   average_rating_as_passenger * total_ratings_received_as_passenger) / 
                  (total_ratings_received_as_rider + total_ratings_received_as_passenger))
            ELSE 0
        END,
        total_ratings_received_as_rider + total_ratings_received_as_passenger,
        total_rides_as_rider + total_rides_as_passenger,
        completed_rides_as_rider + completed_rides_as_passenger,
        cancelled_rides_as_rider + cancelled_rides_as_passenger,
        late_cancellations_count,
        no_show_count
    INTO v_avg_rating, v_total_ratings, v_total_rides, v_completed_rides, 
         v_cancelled_rides, v_late_cancellations, v_no_shows
    FROM public.user_stats
    WHERE user_uid = p_user_uid;

    IF NOT FOUND THEN
        RETURN 100;
    END IF;

    v_new_trust_score := calculate_trust_score(
        v_avg_rating, v_total_ratings, v_total_rides, v_completed_rides,
        v_cancelled_rides, v_late_cancellations, v_no_shows
    );

    UPDATE public.user_stats
    SET trust_score = v_new_trust_score, updated_at = NOW()
    WHERE user_uid = p_user_uid;

    RETURN v_new_trust_score;
END;
$$ LANGUAGE plpgsql;

-- Auto-update trust score on stats change
CREATE OR REPLACE FUNCTION trigger_update_trust_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.trust_score := calculate_trust_score(
        CASE 
            WHEN (NEW.total_ratings_received_as_rider + NEW.total_ratings_received_as_passenger) > 0 
            THEN ((NEW.average_rating_as_rider * NEW.total_ratings_received_as_rider + 
                   NEW.average_rating_as_passenger * NEW.total_ratings_received_as_passenger) / 
                  (NEW.total_ratings_received_as_rider + NEW.total_ratings_received_as_passenger))
            ELSE 0
        END,
        NEW.total_ratings_received_as_rider + NEW.total_ratings_received_as_passenger,
        NEW.total_rides_as_rider + NEW.total_rides_as_passenger,
        NEW.completed_rides_as_rider + NEW.completed_rides_as_passenger,
        NEW.cancelled_rides_as_rider + NEW.cancelled_rides_as_passenger,
        NEW.late_cancellations_count,
        NEW.no_show_count
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_calculate_trust_score ON public.user_stats;
CREATE TRIGGER auto_calculate_trust_score
    BEFORE INSERT OR UPDATE ON public.user_stats
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_trust_score();

-- Recalculate existing scores
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT user_uid FROM public.user_stats LOOP
        PERFORM update_user_trust_score(user_record.user_uid);
    END LOOP;
END $$;

COMMENT ON FUNCTION calculate_trust_score IS 'Calculates user trust score (0-100) based on ratings, completion rate, reliability, and experience';
COMMENT ON FUNCTION update_user_trust_score IS 'Updates and returns trust score for a specific user';
