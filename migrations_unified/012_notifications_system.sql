-- ============================================================================
-- UniRide Unified Migration 012: Notifications System
-- Purpose: Complete notification system with all notification types
-- Compatible with: Main App + Admin Dashboard
-- ============================================================================

-- Create notification_type enum with all types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
            'rideRequest',
            'rideAccepted',
            'rideCancelled',
            'rideCompleted',
            'newMessage',
            'system',
            'rideRequestAccepted',
            'rideJoinRequest',
            'rideJoined',
            'rideOfferCancelled',
            'rideOfferUpdated'
        );
    END IF;
END $$;

-- Add missing enum values if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type') 
        AND enumlabel = 'rideRequestAccepted'
    ) THEN
        ALTER TYPE notification_type ADD VALUE 'rideRequestAccepted';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type') 
        AND enumlabel = 'rideJoinRequest'
    ) THEN
        ALTER TYPE notification_type ADD VALUE 'rideJoinRequest';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type') 
        AND enumlabel = 'rideJoined'
    ) THEN
        ALTER TYPE notification_type ADD VALUE 'rideJoined';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type') 
        AND enumlabel = 'rideOfferCancelled'
    ) THEN
        ALTER TYPE notification_type ADD VALUE 'rideOfferCancelled';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type') 
        AND enumlabel = 'rideOfferUpdated'
    ) THEN
        ALTER TYPE notification_type ADD VALUE 'rideOfferUpdated';
    END IF;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_uid TEXT NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    action_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_uid ON public.notifications(user_uid);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Create notification function
CREATE OR REPLACE FUNCTION public.create_notification(
    target_user_uid TEXT,
    notification_type notification_type,
    notification_title TEXT,
    notification_message TEXT,
    notification_action_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_uid, type, title, message, action_data
    ) VALUES (
        target_user_uid, notification_type, notification_title, 
        notification_message, notification_action_data
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_uid = get_firebase_uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_uid = get_firebase_uid());

CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_notification(TEXT, notification_type, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_notification(TEXT, notification_type, TEXT, TEXT, JSONB) TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

COMMENT ON TABLE public.notifications IS 'User notifications for ride events and system messages';
COMMENT ON FUNCTION public.create_notification IS 'Helper function to create notifications';
