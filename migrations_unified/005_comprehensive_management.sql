-- ============================================================================
-- UniRide Unified Migration 005: Comprehensive Management System
-- Purpose: Transactions, ratings, user stats, cancellations, and triggers
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

-- ============================================================================
-- PART 1: ENHANCE RIDES TABLE WITH STATUS VALUES
-- ============================================================================

ALTER TABLE public.rides ALTER COLUMN status DROP DEFAULT;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'created' AND enumtypid = 'ride_status'::regtype) THEN
        ALTER TYPE ride_status ADD VALUE 'created';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'matched' AND enumtypid = 'ride_status'::regtype) THEN
        ALTER TYPE ride_status ADD VALUE 'matched';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ongoing' AND enumtypid = 'ride_status'::regtype) THEN
        ALTER TYPE ride_status ADD VALUE 'ongoing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled_by_rider' AND enumtypid = 'ride_status'::regtype) THEN
        ALTER TYPE ride_status ADD VALUE 'cancelled_by_rider';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled_by_passenger' AND enumtypid = 'ride_status'::regtype) THEN
        ALTER TYPE ride_status ADD VALUE 'cancelled_by_passenger';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'expired' AND enumtypid = 'ride_status'::regtype) THEN
        ALTER TYPE ride_status ADD VALUE 'expired';
    END IF;
END $$;

ALTER TABLE public.rides ALTER COLUMN status SET DEFAULT 'active'::ride_status;

-- Add financial tracking columns
ALTER TABLE public.rides
ADD COLUMN IF NOT EXISTS earnings DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'held', 'processing', 'completed', 'refunded', 'failed')),
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS ride_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completion_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS distance_km DECIMAL(8, 2),
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- PART 2: RIDE TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ride_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
    payer_uid TEXT NOT NULL,
    payee_uid TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    platform_fee DECIMAL(10, 2) DEFAULT 0.00 CHECK (platform_fee >= 0),
    net_amount DECIMAL(10, 2) NOT NULL CHECK (net_amount >= 0),
    currency TEXT DEFAULT 'BDT',
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('ride_payment', 'cancellation_fee', 'refund', 'bonus')),
    payment_method TEXT,
    payment_gateway_ref TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    processed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT transaction_amount_check CHECK (amount = net_amount + platform_fee)
);

CREATE INDEX IF NOT EXISTS idx_transactions_ride ON public.ride_transactions(ride_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payer ON public.ride_transactions(payer_uid);
CREATE INDEX IF NOT EXISTS idx_transactions_payee ON public.ride_transactions(payee_uid);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.ride_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.ride_transactions(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_ride_payment 
    ON public.ride_transactions(ride_id, transaction_type) 
    WHERE transaction_type = 'ride_payment' AND status = 'completed';

-- ============================================================================
-- PART 3: RIDE RATINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ride_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
    rater_uid TEXT NOT NULL,
    rated_uid TEXT NOT NULL,
    rater_role TEXT NOT NULL CHECK (rater_role IN ('rider', 'passenger')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    review_tags TEXT[],
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    moderated_at TIMESTAMPTZ,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ride_id, rater_uid, rated_uid)
);

CREATE INDEX IF NOT EXISTS idx_ratings_ride ON public.ride_ratings(ride_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rated_user ON public.ride_ratings(rated_uid) WHERE is_visible = TRUE;
CREATE INDEX IF NOT EXISTS idx_ratings_flagged ON public.ride_ratings(is_flagged) WHERE is_flagged = TRUE;

-- ============================================================================
-- PART 4: USER STATISTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_stats (
    user_uid TEXT PRIMARY KEY,
    total_rides_as_rider INTEGER DEFAULT 0,
    total_rides_as_passenger INTEGER DEFAULT 0,
    completed_rides_as_rider INTEGER DEFAULT 0,
    completed_rides_as_passenger INTEGER DEFAULT 0,
    cancelled_rides_as_rider INTEGER DEFAULT 0,
    cancelled_rides_as_passenger INTEGER DEFAULT 0,
    total_earnings DECIMAL(12, 2) DEFAULT 0.00,
    pending_earnings DECIMAL(12, 2) DEFAULT 0.00,
    withdrawn_earnings DECIMAL(12, 2) DEFAULT 0.00,
    total_spent DECIMAL(12, 2) DEFAULT 0.00,
    average_rating_as_rider DECIMAL(3, 2) DEFAULT 0.00,
    average_rating_as_passenger DECIMAL(3, 2) DEFAULT 0.00,
    total_ratings_received_as_rider INTEGER DEFAULT 0,
    total_ratings_received_as_passenger INTEGER DEFAULT 0,
    cancellation_rate_as_rider DECIMAL(5, 2) DEFAULT 0.00,
    cancellation_rate_as_passenger DECIMAL(5, 2) DEFAULT 0.00,
    late_cancellations_count INTEGER DEFAULT 0,
    no_show_count INTEGER DEFAULT 0,
    trust_score INTEGER DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
    is_verified BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    first_ride_at TIMESTAMPTZ,
    last_ride_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_stats_trust_score ON public.user_stats(trust_score);
CREATE INDEX IF NOT EXISTS idx_user_stats_suspended ON public.user_stats(is_suspended) WHERE is_suspended = TRUE;

-- ============================================================================
-- PART 5: RIDE CANCELLATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ride_cancellations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
    cancelled_by_uid TEXT NOT NULL,
    cancelled_by_role TEXT NOT NULL CHECK (cancelled_by_role IN ('rider', 'passenger')),
    cancellation_stage TEXT NOT NULL CHECK (cancellation_stage IN ('before_match', 'after_match', 'during_ride', 'no_show')),
    reason_category TEXT NOT NULL CHECK (reason_category IN (
        'personal_emergency', 'found_alternative', 'no_longer_needed',
        'passenger_no_show', 'rider_no_show', 'safety_concern',
        'payment_issue', 'vehicle_issue', 'weather', 'other'
    )),
    reason_text TEXT,
    cancellation_fee_applied BOOLEAN DEFAULT FALSE,
    fee_amount DECIMAL(10, 2) DEFAULT 0.00,
    refund_issued BOOLEAN DEFAULT FALSE,
    refund_amount DECIMAL(10, 2) DEFAULT 0.00,
    ride_depart_time TIMESTAMPTZ NOT NULL,
    hours_before_departure DECIMAL(8, 2),
    affected_uid TEXT,
    affected_compensated BOOLEAN DEFAULT FALSE,
    compensation_amount DECIMAL(10, 2) DEFAULT 0.00,
    cancelled_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cancellations_ride ON public.ride_cancellations(ride_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_user ON public.ride_cancellations(cancelled_by_uid);
CREATE INDEX IF NOT EXISTS idx_cancellations_stage ON public.ride_cancellations(cancellation_stage);
CREATE INDEX IF NOT EXISTS idx_cancellations_date ON public.ride_cancellations(cancelled_at DESC);

-- ============================================================================
-- PART 6: TRIGGERS & FUNCTIONS
-- ============================================================================

-- Update user stats on ride completion
CREATE OR REPLACE FUNCTION update_user_stats_on_ride_complete()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_stats (user_uid, completed_rides_as_rider, total_rides_as_rider, last_ride_at)
    VALUES (NEW.owner_uid, 1, 1, NEW.completed_at)
    ON CONFLICT (user_uid) DO UPDATE SET
        completed_rides_as_rider = user_stats.completed_rides_as_rider + 1,
        total_rides_as_rider = user_stats.total_rides_as_rider + 1,
        last_ride_at = NEW.completed_at,
        updated_at = NOW();
    
    IF NEW.passenger_uid IS NOT NULL THEN
        INSERT INTO public.user_stats (user_uid, completed_rides_as_passenger, total_rides_as_passenger, last_ride_at)
        VALUES (NEW.passenger_uid, 1, 1, NEW.completed_at)
        ON CONFLICT (user_uid) DO UPDATE SET
            completed_rides_as_passenger = user_stats.completed_rides_as_passenger + 1,
            total_rides_as_passenger = user_stats.total_rides_as_passenger + 1,
            last_ride_at = NEW.completed_at,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_stats_on_complete ON public.rides;
CREATE TRIGGER trigger_update_user_stats_on_complete
    AFTER UPDATE ON public.rides
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION update_user_stats_on_ride_complete();

-- Update earnings on ride completion
CREATE OR REPLACE FUNCTION update_earnings_on_ride_complete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.earnings > 0 THEN
        INSERT INTO public.user_stats (user_uid, total_earnings, pending_earnings)
        VALUES (NEW.owner_uid, NEW.earnings, NEW.earnings)
        ON CONFLICT (user_uid) DO UPDATE SET
            total_earnings = user_stats.total_earnings + NEW.earnings,
            pending_earnings = user_stats.pending_earnings + NEW.earnings,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_earnings_on_complete ON public.rides;
CREATE TRIGGER trigger_update_earnings_on_complete
    AFTER UPDATE ON public.rides
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION update_earnings_on_ride_complete();

-- Update ratings
CREATE OR REPLACE FUNCTION update_user_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3, 2);
    rating_count INTEGER;
BEGIN
    IF NEW.rater_role = 'rider' THEN
        SELECT ROUND(AVG(rating)::numeric, 2), COUNT(*)
        INTO avg_rating, rating_count
        FROM public.ride_ratings
        WHERE rated_uid = NEW.rated_uid AND rater_role = 'rider' AND is_visible = TRUE;
        
        INSERT INTO public.user_stats (user_uid, average_rating_as_passenger, total_ratings_received_as_passenger)
        VALUES (NEW.rated_uid, avg_rating, rating_count)
        ON CONFLICT (user_uid) DO UPDATE SET
            average_rating_as_passenger = avg_rating,
            total_ratings_received_as_passenger = rating_count,
            updated_at = NOW();
    ELSE
        SELECT ROUND(AVG(rating)::numeric, 2), COUNT(*)
        INTO avg_rating, rating_count
        FROM public.ride_ratings
        WHERE rated_uid = NEW.rated_uid AND rater_role = 'passenger' AND is_visible = TRUE;
        
        INSERT INTO public.user_stats (user_uid, average_rating_as_rider, total_ratings_received_as_rider)
        VALUES (NEW.rated_uid, avg_rating, rating_count)
        ON CONFLICT (user_uid) DO UPDATE SET
            average_rating_as_rider = avg_rating,
            total_ratings_received_as_rider = rating_count,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_rating_stats ON public.ride_ratings;
CREATE TRIGGER trigger_update_user_rating_stats
    AFTER INSERT OR UPDATE ON public.ride_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating_stats();

-- Track cancellations
CREATE OR REPLACE FUNCTION track_ride_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    hours_before DECIMAL(8, 2);
    is_late_cancel BOOLEAN;
BEGIN
    IF (NEW.status::text LIKE 'cancelled%' OR NEW.status = 'cancelled')
       AND (OLD.status::text NOT LIKE 'cancelled%' AND OLD.status != 'cancelled') THEN
        
        hours_before := EXTRACT(EPOCH FROM (NEW.depart_at - NEW.cancelled_at)) / 3600.0;
        is_late_cancel := hours_before < 1.0;
        
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
            is_late_cancel, NEW.cancellation_fee
        );
        
        IF NEW.cancelled_by_uid = NEW.owner_uid THEN
            INSERT INTO public.user_stats (user_uid, cancelled_rides_as_rider, late_cancellations_count)
            VALUES (NEW.cancelled_by_uid, 1, CASE WHEN is_late_cancel THEN 1 ELSE 0 END)
            ON CONFLICT (user_uid) DO UPDATE SET
                cancelled_rides_as_rider = user_stats.cancelled_rides_as_rider + 1,
                late_cancellations_count = user_stats.late_cancellations_count + CASE WHEN is_late_cancel THEN 1 ELSE 0 END,
                updated_at = NOW();
        ELSE
            INSERT INTO public.user_stats (user_uid, cancelled_rides_as_passenger, late_cancellations_count)
            VALUES (NEW.cancelled_by_uid, 1, CASE WHEN is_late_cancel THEN 1 ELSE 0 END)
            ON CONFLICT (user_uid) DO UPDATE SET
                cancelled_rides_as_passenger = user_stats.cancelled_rides_as_passenger + 1,
                late_cancellations_count = user_stats.late_cancellations_count + CASE WHEN is_late_cancel THEN 1 ELSE 0 END,
                updated_at = NOW();
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

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.ride_transactions;
DROP TRIGGER IF EXISTS update_ratings_updated_at ON public.ride_ratings;
DROP TRIGGER IF EXISTS update_user_stats_updated_at ON public.user_stats;

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.ride_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON public.ride_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public.user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Permissions
GRANT SELECT, INSERT, UPDATE ON public.rides TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ride_transactions TO authenticated;
GRANT SELECT, INSERT ON public.ride_ratings TO authenticated;
GRANT SELECT ON public.user_stats TO authenticated;
GRANT SELECT ON public.ride_cancellations TO authenticated;
