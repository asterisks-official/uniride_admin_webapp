import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';

// Type aliases for convenience
type RideRow = Database['public']['Tables']['rides']['Row'];
type RequestRow = Database['public']['Tables']['ride_requests']['Row'];
type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

/**
 * Subscribe to ride status changes
 * Listens for INSERT, UPDATE, and DELETE events on the rides table
 */
export function subscribeToRides(
  onInsert?: (ride: RideRow) => void,
  onUpdate?: (ride: RideRow) => void,
  onDelete?: (oldRide: RideRow) => void
): RealtimeChannel | null {
  // Return null if not in browser
  if (typeof window === 'undefined') {
    console.warn('Supabase subscription attempted during SSR - subscribeToRides');
    return null;
  }

  try {
    const channel = supabaseClient
      .channel('rides-changes')
      .on<RideRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rides',
        },
        (payload: RealtimePostgresChangesPayload<RideRow>) => {
          if (onInsert && payload.new && 'id' in payload.new) {
            onInsert(payload.new as RideRow);
          }
        }
      )
      .on<RideRow>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
        },
        (payload: RealtimePostgresChangesPayload<RideRow>) => {
          if (onUpdate && payload.new && 'id' in payload.new) {
            onUpdate(payload.new as RideRow);
          }
        }
      )
      .on<RideRow>(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'rides',
        },
        (payload: RealtimePostgresChangesPayload<RideRow>) => {
          if (onDelete && payload.old && 'id' in payload.old) {
            onDelete(payload.old as RideRow);
          }
        }
      )
      .subscribe();

    return channel;
  } catch (error) {
    console.error('Failed to create Supabase subscription:', error);
    return null;
  }
}

/**
 * Subscribe to ride status changes for a specific ride
 */
export function subscribeToRideById(
  rideId: string,
  onUpdate: (ride: RideRow) => void
): RealtimeChannel | null {
  // Return null if not in browser
  if (typeof window === 'undefined') {
    console.warn('Supabase subscription attempted during SSR - subscribeToRideById');
    return null;
  }

  try {
    const channel = supabaseClient
      .channel(`ride-${rideId}`)
      .on<RideRow>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${rideId}`,
        },
        (payload: RealtimePostgresChangesPayload<RideRow>) => {
          if (payload.new && 'id' in payload.new) {
            onUpdate(payload.new as RideRow);
          }
        }
      )
      .subscribe();

    return channel;
  } catch (error) {
    console.error('Failed to create Supabase subscription:', error);
    return null;
  }
}

/**
 * Subscribe to ride requests changes
 * Listens for INSERT, UPDATE, and DELETE events on the ride_requests table
 */
export function subscribeToRideRequests(
  onInsert?: (request: RequestRow) => void,
  onUpdate?: (request: RequestRow) => void,
  onDelete?: (oldRequest: RequestRow) => void
): RealtimeChannel | null {
  // Return null if not in browser
  if (typeof window === 'undefined') {
    console.warn('Supabase subscription attempted during SSR - subscribeToRideRequests');
    return null;
  }

  try {
    const channel = supabaseClient
      .channel('ride-requests-changes')
      .on<RequestRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_requests',
        },
        (payload: RealtimePostgresChangesPayload<RequestRow>) => {
          if (onInsert && payload.new && 'id' in payload.new) {
            onInsert(payload.new as RequestRow);
          }
        }
      )
      .on<RequestRow>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
        },
        (payload: RealtimePostgresChangesPayload<RequestRow>) => {
          if (onUpdate && payload.new && 'id' in payload.new) {
            onUpdate(payload.new as RequestRow);
          }
        }
      )
      .on<RequestRow>(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'ride_requests',
        },
        (payload: RealtimePostgresChangesPayload<RequestRow>) => {
          if (onDelete && payload.old && 'id' in payload.old) {
            onDelete(payload.old as RequestRow);
          }
        }
      )
      .subscribe();

    return channel;
  } catch (error) {
    console.error('Failed to create Supabase subscription:', error);
    return null;
  }
}

/**
 * Subscribe to ride requests for a specific ride
 */
export function subscribeToRideRequestsByRideId(
  rideId: string,
  onInsert?: (request: RequestRow) => void,
  onUpdate?: (request: RequestRow) => void
): RealtimeChannel | null {
  // Return null if not in browser
  if (typeof window === 'undefined') {
    console.warn('Supabase subscription attempted during SSR - subscribeToRideRequestsByRideId');
    return null;
  }

  try {
    const channel = supabaseClient
      .channel(`ride-requests-${rideId}`)
      .on<RequestRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_requests',
          filter: `ride_id=eq.${rideId}`,
        },
        (payload: RealtimePostgresChangesPayload<RequestRow>) => {
          if (onInsert && payload.new && 'id' in payload.new) {
            onInsert(payload.new as RequestRow);
          }
        }
      )
      .on<RequestRow>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `ride_id=eq.${rideId}`,
        },
        (payload: RealtimePostgresChangesPayload<RequestRow>) => {
          if (onUpdate && payload.new && 'id' in payload.new) {
            onUpdate(payload.new as RequestRow);
          }
        }
      )
      .subscribe();

    return channel;
  } catch (error) {
    console.error('Failed to create Supabase subscription:', error);
    return null;
  }
}

/**
 * Subscribe to notifications for a specific user
 * Useful for notification indicators and unread counts
 */
export function subscribeToUserNotifications(
  userUid: string,
  onInsert?: (notification: NotificationRow) => void,
  onUpdate?: (notification: NotificationRow) => void
): RealtimeChannel | null {
  // Return null if not in browser
  if (typeof window === 'undefined') {
    console.warn('Supabase subscription attempted during SSR - subscribeToUserNotifications');
    return null;
  }

  try {
    const channel = supabaseClient
      .channel(`notifications-${userUid}`)
      .on<NotificationRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_uid=eq.${userUid}`,
        },
        (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          if (onInsert && payload.new) {
            onInsert(payload.new as NotificationRow);
          }
        }
      )
      .on<NotificationRow>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_uid=eq.${userUid}`,
        },
        (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          if (onUpdate && payload.new) {
            onUpdate(payload.new as NotificationRow);
          }
        }
      )
      .subscribe();

    return channel;
  } catch (error) {
    console.error('Failed to create Supabase subscription:', error);
    return null;
  }
}

/**
 * Subscribe to all notifications (admin view)
 * Listens for new notifications across all users
 */
export function subscribeToAllNotifications(
  onInsert: (notification: NotificationRow) => void
): RealtimeChannel | null {
  // Return null if not in browser
  if (typeof window === 'undefined') {
    console.warn('Supabase subscription attempted during SSR - subscribeToAllNotifications');
    return null;
  }

  try {
    const channel = supabaseClient
      .channel('all-notifications')
      .on<NotificationRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          if (payload.new) {
            onInsert(payload.new as NotificationRow);
          }
        }
      )
      .subscribe();

    return channel;
  } catch (error) {
    console.error('Failed to create Supabase subscription:', error);
    return null;
  }
}

export function subscribeToPendingVerifications(
  onChange: () => void
): RealtimeChannel | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const channel = supabaseClient
      .channel('pending-verifications')
      .on<UserRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: 'rider_verification_status=eq.pending',
        },
        () => {
          onChange();
        }
      )
      .subscribe();
    return channel;
  } catch (error) {
    return null;
  }
}

/**
 * Unsubscribe from a Realtime channel and clean up resources
 */
export async function unsubscribe(channel: RealtimeChannel | null): Promise<void> {
  if (!channel) return;
  
  if (typeof window === 'undefined') {
    console.warn('Supabase unsubscribe attempted during SSR');
    return;
  }

  try {
    await supabaseClient.removeChannel(channel);
  } catch (error) {
    console.error('Failed to unsubscribe from Supabase channel:', error);
  }
}

/**
 * Unsubscribe from all active Realtime channels
 */
export async function unsubscribeAll(): Promise<void> {
  await supabaseClient.removeAllChannels();
}

/**
 * Custom hook for managing Realtime subscriptions with automatic cleanup
 * Usage in React components:
 * 
 * useEffect(() => {
 *   const channel = subscribeToRides(handleInsert, handleUpdate);
 *   return () => unsubscribe(channel);
 * }, []);
 */
