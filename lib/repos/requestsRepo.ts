import { supabase } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types';
import { auditRepo } from './auditRepo';

// Type aliases for cleaner code
type RideRequestRow = Database['public']['Tables']['ride_requests']['Row'];
type RideRequestUpdate = Database['public']['Tables']['ride_requests']['Update'];
type RideRow = Database['public']['Tables']['rides']['Row'];
type RideUpdate = Database['public']['Tables']['rides']['Update'];

// Request interface
export interface RideRequest {
  id: string;
  rideId: string;
  passengerUid: string;
  seatsRequested: number;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

// Filters for listing requests
export interface RequestFilters {
  rideId?: string;
  status?: 'pending' | 'accepted' | 'declined' | 'expired';
}

// Pagination parameters
export interface Pagination {
  page: number;
  pageSize: number;
}

// Paginated result
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Repository for managing ride request operations
 * Handles listing, retrieving, and moderating ride requests
 */
export class RequestsRepository {
  /**
   * List ride requests with optional filtering and pagination
   * @param filters - Optional filters to apply
   * @param pagination - Pagination parameters
   * @returns Paginated list of ride requests
   */
  async listRequests(
    filters: RequestFilters = {},
    pagination: Pagination = { page: 1, pageSize: 50 }
  ): Promise<PaginatedResult<RideRequest>> {
    // Build the query with filters
    let query = supabase
      .from('ride_requests')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.rideId) {
      query = query.eq('ride_id', filters.rideId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply pagination
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to list ride requests:', error);
      throw new Error(`Failed to list ride requests: ${error.message}`);
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pagination.pageSize);

    return {
      data: (data || []).map(this.mapRowToRequest),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
    };
  }

  /**
   * Get a specific ride request by ID
   * @param id - The ride request ID
   * @returns The ride request or null if not found
   */
  async getRequestById(id: string): Promise<RideRequest | null> {
    const { data, error } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Failed to get ride request:', error);
      throw new Error(`Failed to get ride request: ${error.message}`);
    }

    return this.mapRowToRequest(data);
  }

  /**
   * Force accept a ride request (admin override)
   * Updates request status to accepted and matches passenger to ride
   * @param id - The ride request ID
   * @param adminUid - The admin user ID performing the action
   */
  async forceAcceptRequest(id: string, adminUid: string): Promise<void> {
    // Get the request details first
    const request = await this.getRequestById(id);
    if (!request) {
      throw new Error('Ride request not found');
    }

    // Get the ride details
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', request.rideId)
      .single();

    if (rideError || !ride) {
      throw new Error('Associated ride not found');
    }

    // Check if ride has enough available seats
    if (ride.seats_available < request.seatsRequested) {
      throw new Error('Not enough available seats on the ride');
    }

    // Update request status to accepted
    const requestUpdate: RideRequestUpdate = {
      status: 'accepted',
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('ride_requests')
      .update(requestUpdate)
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update request status:', updateError);
      throw new Error(`Failed to update request status: ${updateError.message}`);
    }

    // Update ride to match passenger
    const rideUpdate: RideUpdate = {
      passenger_uid: request.passengerUid,
      seats_available: ride.seats_available - request.seatsRequested,
      status: 'matched',
      matched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: rideUpdateError } = await supabase
      .from('rides')
      .update(rideUpdate)
      .eq('id', request.rideId);

    if (rideUpdateError) {
      console.error('Failed to update ride:', rideUpdateError);
      throw new Error(`Failed to update ride: ${rideUpdateError.message}`);
    }

    // Log the action
    await auditRepo.logAction({
      adminUid,
      action: 'force_accept_request',
      entityType: 'ride_request',
      entityId: id,
      diff: {
        before: { status: request.status },
        after: { status: 'accepted', rideStatus: 'matched', passengerUid: request.passengerUid },
      },
    });
  }

  /**
   * Force decline a ride request (admin override)
   * Updates request status to declined
   * @param id - The ride request ID
   * @param adminUid - The admin user ID performing the action
   */
  async forceDeclineRequest(id: string, adminUid: string): Promise<void> {
    // Get the request details first
    const request = await this.getRequestById(id);
    if (!request) {
      throw new Error('Ride request not found');
    }

    // Update request status to declined
    const requestUpdate: RideRequestUpdate = {
      status: 'declined',
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('ride_requests')
      .update(requestUpdate)
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update request status:', updateError);
      throw new Error(`Failed to update request status: ${updateError.message}`);
    }

    // Log the action
    await auditRepo.logAction({
      adminUid,
      action: 'force_decline_request',
      entityType: 'ride_request',
      entityId: id,
      diff: {
        before: { status: request.status },
        after: { status: 'declined' },
      },
    });
  }

  /**
   * Map database row to RideRequest interface
   * @param row - Database row
   * @returns Formatted RideRequest object
   */
  private mapRowToRequest(row: RideRequestRow): RideRequest {
    return {
      id: row.id,
      rideId: row.ride_id,
      passengerUid: row.passenger_uid,
      seatsRequested: row.seats_requested,
      message: row.message,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Export singleton instance
export const requestsRepo = new RequestsRepository();
