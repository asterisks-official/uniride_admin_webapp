import { supabase } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types';

// Type aliases
type RideTransactionRow = Database['public']['Tables']['ride_transactions']['Row'];

// Re-export RideTransaction interface (defined in ridesRepo for consistency)
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

// Transaction filters interface
export interface TransactionFilters {
  rideId?: string;
  userUid?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  transactionType?: 'ride_payment' | 'cancellation_fee' | 'refund' | 'bonus';
  startDate?: Date;
  endDate?: Date;
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
 * Repository for managing transaction operations
 * Handles transaction data from Supabase including listings and details
 */
export class TransactionsRepository {
  /**
   * List transactions with filters and pagination
   * @param filters - Optional filters for ride, user, status, type, date range
   * @param pagination - Pagination parameters
   * @returns Paginated list of transactions
   */
  async listTransactions(
    filters: TransactionFilters = {},
    pagination: Pagination = { page: 1, pageSize: 50 }
  ): Promise<PaginatedResult<RideTransaction>> {
    try {
      // Build query with filters
      let query = supabase
        .from('ride_transactions')
        .select('*', { count: 'exact' });

      // Apply ride ID filter
      if (filters.rideId) {
        query = query.eq('ride_id', filters.rideId);
      }

      // Apply user filter (either payer or payee)
      if (filters.userUid) {
        query = query.or(`payer_uid.eq.${filters.userUid},payee_uid.eq.${filters.userUid}`);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply transaction type filter
      if (filters.transactionType) {
        query = query.eq('transaction_type', filters.transactionType);
      }

      // Apply date range filters
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      // Apply pagination and ordering
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        // Check if table doesn't exist (graceful degradation)
        if (error.code === '42P01') {
          console.warn('ride_transactions table not found. Run migrations_unified.');
          return {
            data: [],
            total: 0,
            page: pagination.page,
            pageSize: pagination.pageSize,
            totalPages: 0,
          };
        }
        console.error('Failed to list transactions:', error);
        throw new Error(`Failed to list transactions: ${error.message}`);
      }

      const total = count ?? 0;
      const totalPages = Math.ceil(total / pagination.pageSize);

      return {
        data: (data || []).map(this.mapRowToRideTransaction),
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages,
      };
    } catch (error) {
      console.error('Error listing transactions:', error);
      // Graceful degradation
      return {
        data: [],
        total: 0,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: 0,
      };
    }
  }

  /**
   * Get a single transaction by ID
   * @param id - Transaction ID
   * @returns Transaction details or null if not found
   */
  async getTransactionById(id: string): Promise<RideTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('ride_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        // Check if table doesn't exist (graceful degradation)
        if (error.code === '42P01') {
          console.warn('ride_transactions table not found. Run migrations_unified.');
          return null;
        }
        console.error('Failed to get transaction:', error);
        throw new Error(`Failed to get transaction: ${error.message}`);
      }

      return this.mapRowToRideTransaction(data);
    } catch (error) {
      console.error('Error getting transaction:', error);
      return null; // Graceful degradation
    }
  }

  /**
   * Get all transactions for a specific ride
   * @param rideId - Ride ID
   * @returns List of transactions for the ride
   */
  async getTransactionsByRideId(rideId: string): Promise<RideTransaction[]> {
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
        console.error('Failed to get transactions by ride ID:', error);
        throw new Error(`Failed to get transactions by ride ID: ${error.message}`);
      }

      return (data || []).map(this.mapRowToRideTransaction);
    } catch (error) {
      console.error('Error getting transactions by ride ID:', error);
      return []; // Graceful degradation
    }
  }

  /**
   * Get all transactions for a specific user (as payer or payee)
   * @param userUid - User UID
   * @param role - Filter by role: 'payer', 'payee', or undefined for both
   * @returns List of transactions for the user
   */
  async getTransactionsByUserId(
    userUid: string,
    role?: 'payer' | 'payee'
  ): Promise<RideTransaction[]> {
    try {
      let query = supabase
        .from('ride_transactions')
        .select('*');

      // Apply role-specific filter
      if (role === 'payer') {
        query = query.eq('payer_uid', userUid);
      } else if (role === 'payee') {
        query = query.eq('payee_uid', userUid);
      } else {
        // Both payer and payee
        query = query.or(`payer_uid.eq.${userUid},payee_uid.eq.${userUid}`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        // Check if table doesn't exist (graceful degradation)
        if (error.code === '42P01') {
          console.warn('ride_transactions table not found. Run migrations_unified.');
          return [];
        }
        console.error('Failed to get transactions by user ID:', error);
        throw new Error(`Failed to get transactions by user ID: ${error.message}`);
      }

      return (data || []).map(this.mapRowToRideTransaction);
    } catch (error) {
      console.error('Error getting transactions by user ID:', error);
      return []; // Graceful degradation
    }
  }

  /**
   * Map database row to RideTransaction interface
   * @param row - Database row
   * @returns Formatted RideTransaction object
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
}

// Export singleton instance
export const transactionsRepo = new TransactionsRepository();
