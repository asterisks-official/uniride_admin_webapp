-- ============================================================================
-- UniRide Unified Migration 001: Core Schema
-- Purpose: Create base tables for rides and ride requests
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');
CREATE TYPE ride_status AS ENUM ('active', 'completed', 'cancelled');

-- Rides table (references Firebase UIDs)
CREATE TABLE public.rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_uid TEXT NOT NULL,  -- Firebase UID, not a foreign key
    
    -- Location details (simplified, no geo queries yet)
    from_location TEXT NOT NULL,
    from_lat DECIMAL(10, 8),
    from_lng DECIMAL(11, 8),
    to_location TEXT NOT NULL,
    to_lat DECIMAL(10, 8),
    to_lng DECIMAL(11, 8),
    
    -- Ride details
    depart_at TIMESTAMPTZ NOT NULL,
    seats_total INTEGER NOT NULL CHECK (seats_total > 0),
    seats_available INTEGER NOT NULL CHECK (seats_available >= 0),
    price DECIMAL(10, 2),
    vehicle_info TEXT,
    notes TEXT,
    
    -- Status
    status ride_status DEFAULT 'active',
    visible BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (seats_available <= seats_total),
    CHECK (depart_at > created_at)
);

-- Ride requests table (references Firebase UIDs)
CREATE TABLE public.ride_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
    passenger_uid TEXT NOT NULL,  -- Firebase UID, not a foreign key
    
    seats_requested INTEGER NOT NULL DEFAULT 1 CHECK (seats_requested > 0),
    message TEXT,
    status request_status DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate pending requests
    UNIQUE (ride_id, passenger_uid, status)
);

-- Create indexes for common queries
CREATE INDEX idx_rides_owner ON public.rides(owner_uid);
CREATE INDEX idx_rides_depart_at ON public.rides(depart_at) WHERE status = 'active' AND visible = TRUE;
CREATE INDEX idx_rides_status ON public.rides(status);
CREATE INDEX idx_requests_ride ON public.ride_requests(ride_id);
CREATE INDEX idx_requests_passenger ON public.ride_requests(passenger_uid);
CREATE INDEX idx_requests_status ON public.ride_requests(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON public.rides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.ride_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically decrement seats when request is accepted
CREATE OR REPLACE FUNCTION handle_request_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Decrement available seats
        UPDATE public.rides
        SET seats_available = seats_available - NEW.seats_requested
        WHERE id = NEW.ride_id
        AND seats_available >= NEW.seats_requested;
        
        -- Check if update succeeded
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Not enough seats available';
        END IF;
    ELSIF NEW.status = 'declined' OR NEW.status = 'cancelled' THEN
        -- If previously accepted, return seats
        IF OLD.status = 'accepted' THEN
            UPDATE public.rides
            SET seats_available = seats_available + NEW.seats_requested
            WHERE id = NEW.ride_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_request_status_change
    BEFORE UPDATE ON public.ride_requests
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_request_acceptance();

COMMENT ON TABLE public.rides IS 'Core rides table for both ride offers and requests';
COMMENT ON TABLE public.ride_requests IS 'Match requests between passengers and ride offers';
