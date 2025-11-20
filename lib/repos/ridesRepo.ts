import { supabase } from '@/lib/supabase/server';
import { auditRepo } from './auditRepo';
import { Database, RideStatus } from '@/lib/supabase/types';

// Type aliases
type RideRow = Database['public']['Tables']['rides']['Row'];
type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];
type RatingRow = Database['public']['Tables']['ride_ratings']['Row'];
type RideTransactionRow = Database['public']['Tables']['ride_transactions']['Row'];
type RideCancellationRow = Database['public']['Tables']['ride_cancellations']['Row'];

// Type definitions
export interface Ride {
  id: string;
  ownerUid: string;
  fromLocation: string;
  fromLat: number;
  fromLng: number;
  toLocation: string;
  toLat: number;
  toLng: number;
  departAt: Date;
  seatsTotal: number;
  seatsAvailable: number;
  price: number;
  vehicleInfo: string | null;
  notes: string | null;
  status: RideStatus;
  visible: boolean;
  // New fields from unified schema
  rideType: 'offer' | 'request';
  flexibilityMinutes: number;
  earnings: number;
  platformFee: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string | null;
  rideStartedAt: Date | null;
  completionVerifiedAt: Date | null;
  autoCompletedAt: Date | null;
  cancellationFee: number;
  distanceKm: number | null;
  durationMinutes: number | null;
  // Existing fields
  matchedAt: Date | null;
  riderUid: string | null;
  passengerUid: string | null;
  confirmationDeadline: Date | null;
  riderConfirmedGoing: boolean;
  passengerConfirmedGoing: boolean;
  riderConfirmedCompletion: boolean;
  passengerConfirmedCompletion: boolean;
  cancelledAt: Date | null;
  cancelledByUid: string | null;
  cancellationReason: string | null;
  completedAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RideTransaction {
  id: string;
  rideId: string;
  payerUid: string;
  payeeUid: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  transactionType: 'ride_payment' | 'cancellation_fee' | 'refund' | 'bonus';
  paymentMethod: string | null;
  paymentGatewayRef: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  processedAt: Date | null;
  refundedAt: Date | null;
  refundReason: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RideCancellation {
  id: string;
  rideId: string;
  cancelledByUid: string;
  cancelledByRole: 'rider' | 'passenger';
  cancellationStage: 'before_match' | 'after_match' | 'during_ride' | 'no_show';
  reasonCategory: 'personal_emergency' | 'found_alternative' | 'no_longer_needed' | 'passenger_no_show' | 'rider_no_show' | 'safety_concern' | 'payment_issue' | 'vehicle_issue' | 'weather' | 'other';
  reasonText: string | null;
  cancellationFeeApplied: boolean;
  feeAmount: number;
  refundIssued: boolean;
  refundAmount: number;
  rideDepartTime: Date;
  hoursBeforeDeparture: number | null;
  affectedUid: string | null;
  affectedCompensated: boolean;
  compensationAmount: number;
  cancelledAt: Date;
  createdAt: Date;
}

export interface RideFilters {
  status?: RideStatus;
  ownerUid?: string;
  matched?: boolean;
  rideType?: 'offer' | 'request';
  startDate?: Date;
  endDate?: Date;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ChatMessage {
  id: string;
  rideId: string;
  senderUid: string;
  message: string;
  createdAt: Date;
}

export interface Rating {
  id: string;
  rideId: string;
  raterUid: string;
  ratedUid: string;
  raterRole: 'rider' | 'passenger';
  rating: number;
  review: string | null;
  reviewTags: string[] | null;
  isFlagged: boolean;
  flagReason: string | null;
  moderatedAt: Date | null;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository for managing ride operations
 * Handles ride data from Supabase including listings, details, and moderation actions
 */
export class RidesRepository {
  /**
   * List rides with filters and pagination
   * @param filters - Optional filters for status, owner, matched state, ride type, date range
   * @param pagination - Pagination parameters
   * @returns Paginated list of rides
   */
  async listRides(
    filters: RideFilters = {},
    pagination: Pagination = { page: 1, pageSize: 50 }
  ): Promise<PaginatedResult<Ride>> {
    // Build query with filters
    let query = supabase
      .from('rides')
      .select('*', { count: 'exact' });

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply owner filter
    if (filters.ownerUid) {
      query = query.eq('owner_uid', filters.ownerUid);
    }

    // Apply matched filter
    if (filters.matched !== undefined) {
      if (filters.matched) {
        query = query.not('matched_at', 'is', null);
      } else {
        query = query.is('matched_at', null);
      }
    }

    // Apply ride type filter
    if (filters.rideType) {
      query = query.eq('type', filters.rideType);
    }

    // Apply date range filters
    if (filters.startDate) {
      query = query.gte('depart_at', filters.startDate.toISOString());
    }
    if (filters.endDate) {
      query = query.lte('depart_at', filters.endDate.toISOString());
    }

    // Apply pagination and ordering
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    query = query
      .order('depart_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to list rides:', error);
      throw new Error(`Failed to list rides: ${error.message}`);
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pagination.pageSize);

    return {
      data: (data || []).map(this.mapRowToRide),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
    };
  }

  /**
   * Get a single ride by ID with complete details
   * @param id - Ride ID
   * @returns Ride details or null if not found
   */
  async getRideById(id: string): Promise<Ride | null> {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Failed to get ride:', error);
      throw new Error(`Failed to get ride: ${error.message}`);
    }

    return this.mapRowToRide(data);
  }

  /**
   * Cancel a ride with reason and optional fee
   * @param id - Ride ID
   * @param reason - Cancellation reason
   * @param adminUid - Admin performing the cancellation
   * @param applyFee - Whether to apply a cancellation fee
   * @param feeAmount - Optional fee amount
   */
  async cancelRide(
    id: string,
    reason: string,
    adminUid: string,
    applyFee: boolean = false,
    feeAmount?: number
  ): Promise<void> {
    // Get current ride data for audit log
    const beforeRide = await this.getRideById(id);
    if (!beforeRide) {
      throw new Error('Ride not found');
    }

    // Prepare update data
    const updateData: any = {
      status: 'cancelled' as RideStatus,
      cancelled_at: new Date().toISOString(),
      cancelled_by_uid: adminUid,
      cancellation_reason: reason,
      updated_at: new Date().toISOString(),
    };

    if (applyFee && feeAmount !== undefined) {
      updateData.cancellation_fee = feeAmount;
    }

    // Update ride
    const { error } = await supabase
      .from('rides')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Failed to cancel ride:', error);
      throw new Error(`Failed to cancel ride: ${error.message}`);
    }

    // Create ride_cancellations record
    try {
      const now = new Date();
      const departAt = new Date(beforeRide.departAt);
      const hoursBeforeDeparture = (departAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      const cancellationData = {
        ride_id: id,
        cancelled_by_uid: adminUid,
        cancelled_by_role: 'rider' as const, // Admin cancellation defaults to rider role
        cancellation_stage: beforeRide.matchedAt ? 'after_match' as const : 'before_match' as const,
        reason_category: 'other' as const,
        reason_text: reason,
        cancellation_fee_applied: applyFee,
        fee_amount: applyFee && feeAmount ? feeAmount : 0,
        refund_issued: false,
        refund_amount: 0,
        ride_depart_time: beforeRide.departAt.toISOString(),
        hours_before_departure: hoursBeforeDeparture > 0 ? hoursBeforeDeparture : null,
        affected_uid: beforeRide.passengerUid || beforeRide.riderUid,
        affected_compensated: false,
        compensation_amount: 0,
        cancelled_at: now.toISOString(),
      };

      const { error: cancellationError } = await supabase
        .from('ride_cancellations')
        .insert(cancellationData);

      if (cancellationError) {
        // Log warning but don't fail the operation (graceful degradation)
        console.warn('Failed to create ride_cancellations record:', cancellationError);
      }
    } catch (cancellationError) {
      // Graceful degradation - log error but don't fail the operation
      console.warn('Error creating ride_cancellations record:', cancellationError);
    }

    // Get updated ride data
    const afterRide = await this.getRideById(id);

    // Log audit action
    await auditRepo.logAction({
      adminUid,
      action: 'cancel_ride',
      entityType: 'ride',
      entityId: id,
      diff: {
        before: {
          status: beforeRide.status,
          cancelledAt: beforeRide.cancelledAt,
          cancellationReason: beforeRide.cancellationReason,
          cancellationFee: beforeRide.cancellationFee,
        },
        after: {
          status: afterRide?.status,
          cancelledAt: afterRide?.cancelledAt,
          cancelledByUid: adminUid,
          cancellationReason: reason,
          cancellationFee: applyFee ? feeAmount : null,
        },
      },
    });
  }

  /**
   * Force complete a ride
   * @param id - Ride ID
   * @param adminUid - Admin performing the action
   */
  async forceCompleteRide(id: string, adminUid: string): Promise<void> {
    // Get current ride data for audit log
    const beforeRide = await this.getRideById(id);
    if (!beforeRide) {
      throw new Error('Ride not found');
    }

    // Update ride
    const { error } = await supabase
      .from('rides')
      .update({
        status: 'completed' as RideStatus,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to force complete ride:', error);
      throw new Error(`Failed to force complete ride: ${error.message}`);
    }

    // Get updated ride data
    const afterRide = await this.getRideById(id);

    // Log audit action
    await auditRepo.logAction({
      adminUid,
      action: 'force_complete_ride',
      entityType: 'ride',
      entityId: id,
      diff: {
        before: {
          status: beforeRide.status,
          completedAt: beforeRide.completedAt,
        },
        after: {
          status: afterRide?.status,
          completedAt: afterRide?.completedAt,
        },
      },
    });
  }

  /**
   * Get all chat messages for a ride
   * @param rideId - Ride ID
   * @returns List of chat messages in chronological order
   */
  async getRideChat(rideId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to get ride chat:', error);
      throw new Error(`Failed to get ride chat: ${error.message}`);
    }

    return (data || []).map(this.mapRowToChatMessage);
  }

  /**
   * Get all ratings for a ride
   * @param rideId - Ride ID
   * @returns List of ratings for the ride
   */
  async getRideRatings(rideId: string): Promise<Rating[]> {
    const { data, error } = await supabase
      .from('ride_ratings')
      .select('*')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get ride ratings:', error);
      throw new Error(`Failed to get ride ratings: ${error.message}`);
    }

    return (data || []).map(this.mapRowToRating);
  }

  /**
   * Get all transactions for a ride
   * @param rideId - Ride ID
   * @returns List of transactions for the ride
   */
  async getRideTransactions(rideId: string): Promise<RideTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('ride_transactions')
        .select('*')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: false });

      if (error) {
        // Check if table doesn't exist (graceful degradation)
        if (error.code === '42P01') {
          console.warn('ride_transactions table not found. Run migrations_unified.');
          return [];
        }
        console.error('Failed to get ride transactions:', error);
        throw new Error(`Failed to get ride transactions: ${error.message}`);
      }

      return (data || []).map(this.mapRowToRideTransaction);
    } catch (error) {
      console.error('Error getting ride transactions:', error);
      return []; // Graceful degradation
    }
  }

  /**
   * Get cancellation details for a ride
   * @param rideId - Ride ID
   * @returns Cancellation record or null if not found
   */
  async getRideCancellation(rideId: string): Promise<RideCancellation | null> {
    try {
      const { data, error } = await supabase
        .from('ride_cancellations')
        .select('*')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Check if table doesn't exist (graceful degradation)
        if (error.code === '42P01') {
          console.warn('ride_cancellations table not found. Run migrations_unified.');
          return null;
        }
        console.error('Failed to get ride cancellation:', error);
        throw new Error(`Failed to get ride cancellation: ${error.message}`);
      }

      return data ? this.mapRowToRideCancellation(data) : null;
    } catch (error) {
      console.error('Error getting ride cancellation:', error);
      return null; // Graceful degradation
    }
  }

  /**
   * Map database row to Ride interface
   */
  private mapRowToRide(row: RideRow): Ride {
    return {
      id: row.id,
      ownerUid: row.owner_uid,
      fromLocation: row.from_location,
      fromLat: row.from_lat,
      fromLng: row.from_lng,
      toLocation: row.to_location,
      toLat: row.to_lat,
      toLng: row.to_lng,
      departAt: new Date(row.depart_at),
      seatsTotal: row.seats_total,
      seatsAvailable: row.seats_available,
      price: row.price,
      vehicleInfo: row.vehicle_info,
      notes: row.notes,
      status: row.status,
      visible: row.visible,
      // New fields from unified schema
      rideType: row.type,
      flexibilityMinutes: row.flexibility_minutes,
      earnings: row.earnings,
      platformFee: row.platform_fee,
      totalAmount: row.total_amount,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      rideStartedAt: row.ride_started_at ? new Date(row.ride_started_at) : null,
      completionVerifiedAt: row.completion_verified_at ? new Date(row.completion_verified_at) : null,
      autoCompletedAt: row.auto_completed_at ? new Date(row.auto_completed_at) : null,
      cancellationFee: row.cancellation_fee,
      distanceKm: row.distance_km,
      durationMinutes: row.duration_minutes,
      // Existing fields
      matchedAt: row.matched_at ? new Date(row.matched_at) : null,
      riderUid: row.rider_uid,
      passengerUid: row.passenger_uid,
      confirmationDeadline: row.confirmation_deadline ? new Date(row.confirmation_deadline) : null,
      riderConfirmedGoing: row.rider_confirmed_going,
      passengerConfirmedGoing: row.passenger_confirmed_going,
      riderConfirmedCompletion: row.rider_confirmed_completion,
      passengerConfirmedCompletion: row.passenger_confirmed_completion,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
      cancelledByUid: row.cancelled_by_uid,
      cancellationReason: row.cancellation_reason,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      metadata: row.metadata as Record<string, any> | null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to ChatMessage interface
   */
  private mapRowToChatMessage(row: ChatMessageRow): ChatMessage {
    return {
      id: row.id,
      rideId: row.ride_id,
      senderUid: row.sender_uid,
      message: row.message,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Map database row to Rating interface
   */
  private mapRowToRating(row: RatingRow): Rating {
    return {
      id: row.id,
      rideId: row.ride_id,
      raterUid: row.rater_uid,
      ratedUid: row.rated_uid,
      raterRole: row.rater_role,
      rating: row.rating,
      review: row.review,
      reviewTags: row.review_tags,
      isFlagged: row.is_flagged,
      flagReason: row.flag_reason,
      moderatedAt: row.moderated_at ? new Date(row.moderated_at) : null,
      isVisible: row.is_visible,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to RideTransaction interface
   */
  private mapRowToRideTransaction(row: RideTransactionRow): RideTransaction {
    return {
      id: row.id,
      rideId: row.ride_id,
      payerUid: row.payer_uid,
      payeeUid: row.payee_uid,
      amount: row.amount,
      platformFee: row.platform_fee,
      netAmount: row.net_amount,
      currency: row.currency,
      transactionType: row.transaction_type,
      paymentMethod: row.payment_method,
      paymentGatewayRef: row.payment_gateway_ref,
      status: row.status,
      processedAt: row.processed_at ? new Date(row.processed_at) : null,
      refundedAt: row.refunded_at ? new Date(row.refunded_at) : null,
      refundReason: row.refund_reason,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to RideCancellation interface
   */
  private mapRowToRideCancellation(row: RideCancellationRow): RideCancellation {
    return {
      id: row.id,
      rideId: row.ride_id,
      cancelledByUid: row.cancelled_by_uid,
      cancelledByRole: row.cancelled_by_role,
      cancellationStage: row.cancellation_stage,
      reasonCategory: row.reason_category,
      reasonText: row.reason_text,
      cancellationFeeApplied: row.cancellation_fee_applied,
      feeAmount: row.fee_amount,
      refundIssued: row.refund_issued,
      refundAmount: row.refund_amount,
      rideDepartTime: new Date(row.ride_depart_time),
      hoursBeforeDeparture: row.hours_before_departure,
      affectedUid: row.affected_uid,
      affectedCompensated: row.affected_compensated,
      compensationAmount: row.compensation_amount,
      cancelledAt: new Date(row.cancelled_at),
      createdAt: new Date(row.created_at),
    };
  }
}

// Export singleton instance
export const ridesRepo = new RidesRepository();
