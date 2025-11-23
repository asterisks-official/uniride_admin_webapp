import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';
import { supabase } from '@/lib/supabase/server';
import { auditRepo } from './auditRepo';
import { UserRecord } from 'firebase-admin/auth';

// Type definitions
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  role: 'rider' | 'passenger' | 'both';
  isRiderVerified: boolean;
  riderVerificationStatus: 'pending' | 'approved' | 'rejected' | null;
  isBanned: boolean;
  banReason: string | null;
  createdAt: Date;
  // From Supabase user_stats
  trustScore: number;
  totalRides: number;
  completedRides: number;
  averageRating: number;
  cancellations: number;
  lateCancellations: number;
  noShows: number;
  verificationImages?: {
    bikePhoto?: string;
  };
  verificationDetails?: {
    vehicleModel?: string;
  };
}

export interface UserFilters {
  query?: string;
  role?: 'rider' | 'passenger' | 'both';
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  trustMin?: number;
  trustMax?: number;
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

/**
 * Repository for managing user operations
 * Handles user data from both Firebase (auth/profile) and Supabase (stats)
 */
export class UsersRepository {
  /**
   * List users with filters and pagination
   * Uses Supabase view user_profiles_complete
   */
  async listUsers(
    filters: UserFilters = {},
    pagination: Pagination = { page: 1, pageSize: 50 }
  ): Promise<PaginatedResult<User>> {
    let query = supabase
      .from('user_profiles_complete')
      .select('*', { count: 'exact' });

    if (filters.trustMin !== undefined) {
      query = query.gte('trust_score', filters.trustMin);
    }
    if (filters.trustMax !== undefined) {
      query = query.lte('trust_score', filters.trustMax);
    }
    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    if (filters.verificationStatus) {
      query = query.eq('rider_verification_status', filters.verificationStatus);
    }
    if (filters.query) {
      const search = filters.query;
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    const rows = (data || []) as any[];
    const resultUsers = rows.map(row => this.mapProfileViewRowToUser(row));
    const total = count ?? 0;
    const totalPages = Math.ceil(total / pagination.pageSize);

    return {
      data: resultUsers,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
    };
  }

  /**
   * Get a single user by UID
   * Fetches from Firebase Auth, Firestore, and Supabase
   */
  async getUserByUid(uid: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('user_profiles_complete')
      .select('*')
      .eq('uid', uid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return this.mapProfileViewRowToUser(data as any);
  }

  /**
   * Verify or reject a rider verification request
   */
  async verifyRider(
    uid: string,
    approved: boolean,
    note: string | undefined,
    adminUid: string
  ): Promise<void> {
    const beforeUser = await this.getUserByUid(uid);
    if (!beforeUser) {
      throw new Error('User not found');
    }

    if (approved) {
      const { error } = await supabase.rpc('approve_rider_verification', {
        target_uid: uid,
        admin_uid: adminUid,
      });
      if (error) {
        if ((error.message || '').includes('Only admins')) {
          const { error: upErr } = await supabase
            .from('users')
            .update({
              rider_verification_status: 'approved',
              is_rider_verified: true,
              verification_reviewed_at: new Date().toISOString(),
              verification_reviewed_by: adminUid,
            })
            .eq('uid', uid);
          if (upErr) {
            throw new Error(`Failed to approve verification (fallback): ${upErr.message}`);
          }
        } else {
          throw new Error(`Failed to approve verification: ${error.message}`);
        }
      }
    } else {
      const { error } = await supabase.rpc('reject_rider_verification', {
        target_uid: uid,
        admin_uid: adminUid,
        rejection_reason: note ?? '',
      });
      if (error) {
        if ((error.message || '').includes('Only admins')) {
          const { error: upErr } = await supabase
            .from('users')
            .update({
              rider_verification_status: 'rejected',
              is_rider_verified: false,
              verification_rejection_reason: note ?? '',
              verification_reviewed_at: new Date().toISOString(),
              verification_reviewed_by: adminUid,
            })
            .eq('uid', uid);
          if (upErr) {
            throw new Error(`Failed to reject verification (fallback): ${upErr.message}`);
          }
        } else {
          throw new Error(`Failed to reject verification: ${error.message}`);
        }
      }
    }

    const afterUser = await this.getUserByUid(uid);

    await auditRepo.logAction({
      adminUid,
      action: approved ? 'verify_rider_approved' : 'verify_rider_rejected',
      entityType: 'user',
      entityId: uid,
      diff: {
        before: {
          riderVerificationStatus: beforeUser.riderVerificationStatus,
          isRiderVerified: beforeUser.isRiderVerified,
        },
        after: {
          riderVerificationStatus: afterUser?.riderVerificationStatus,
          isRiderVerified: afterUser?.isRiderVerified,
          note,
        },
      },
    });
  }

  /**
   * Ban a user
   */
  async banUser(uid: string, reason: string, adminUid: string): Promise<void> {
    // Get current user data for audit log
    const beforeUser = await this.getUserByUid(uid);
    if (!beforeUser) {
      throw new Error('User not found');
    }

    // Disable user in Firebase Auth
    await authAdmin.updateUser(uid, {
      disabled: true,
    });

    // Update Firestore
    const userRef = firestoreAdmin.collection('users').doc(uid);
    await userRef.update({
      isBanned: true,
      banReason: reason,
      bannedAt: new Date(),
      updatedAt: new Date(),
    });

    // Get updated user data
    const afterUser = await this.getUserByUid(uid);

    // Log audit action
    await auditRepo.logAction({
      adminUid,
      action: 'ban_user',
      entityType: 'user',
      entityId: uid,
      diff: {
        before: {
          isBanned: beforeUser.isBanned,
          banReason: beforeUser.banReason,
        },
        after: {
          isBanned: afterUser?.isBanned,
          banReason: reason,
        },
      },
    });
  }

  /**
   * Delete a user (soft delete preferred)
   * Marks user as deleted in Firestore and disables in Firebase Auth
   */
  async deleteUser(uid: string, adminUid: string): Promise<void> {
    // Get current user data for audit log
    const beforeUser = await this.getUserByUid(uid);
    if (!beforeUser) {
      throw new Error('User not found');
    }

    const { data, error } = await supabase.rpc('delete_user_completely', {
      target_uid: uid,
    });
    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }

    // Log audit action
    await auditRepo.logAction({
      adminUid,
      action: 'delete_user',
      entityType: 'user',
      entityId: uid,
      diff: {
        before: {
          email: beforeUser.email,
          displayName: beforeUser.displayName,
        },
        after: data ?? { success: true },
      },
    });
  }

  /**
   * Map Firebase UserRecord, Firestore data, and Supabase stats to User interface
   */
  private mapToUser(
    userRecord: UserRecord,
    firestoreData: any,
    stats: any
  ): User {
    return {
      uid: userRecord.uid,
      email: userRecord.email || null,
      displayName: (firestoreData?.name ?? firestoreData?.displayName ?? userRecord.displayName) || null,
      photoURL: (firestoreData?.profileImageUrl ?? firestoreData?.photoURL ?? userRecord.photoURL) || null,
      phoneNumber: (firestoreData?.phone ?? userRecord.phoneNumber) || null,
      role: firestoreData?.role || 'passenger',
      isRiderVerified: firestoreData?.isRiderVerified || false,
      riderVerificationStatus: firestoreData?.riderVerificationStatus || null,
      isBanned: firestoreData?.isBanned || false,
      banReason: firestoreData?.banReason || null,
      createdAt: new Date(userRecord.metadata.creationTime),
      trustScore: stats.trust_score || 0,
      totalRides: stats.total_rides || 0,
      completedRides: stats.completed_rides || 0,
      averageRating: stats.average_rating || 0,
      cancellations: stats.cancellations || 0,
      lateCancellations: stats.late_cancellations || 0,
      noShows: stats.no_shows || 0,
      verificationImages: firestoreData?.bikeImageUrl ? { bikePhoto: firestoreData.bikeImageUrl } : undefined,
      verificationDetails: firestoreData?.bikeModel ? { vehicleModel: firestoreData.bikeModel } : undefined,
    };
  }

  private mapProfileViewRowToUser(row: any): User {
    const completedRides = (row.completed_rides_as_rider ?? 0) + (row.completed_rides_as_passenger ?? 0);
    const totalRides = row.total_rides ?? ((row.total_rides_as_rider ?? 0) + (row.total_rides_as_passenger ?? 0));
    return {
      uid: row.uid,
      email: row.email ?? null,
      displayName: row.name ?? null,
      photoURL: row.profile_image_url ?? null,
      phoneNumber: row.phone ?? null,
      role: (row.role as 'rider' | 'passenger') ?? 'passenger',
      isRiderVerified: !!row.is_rider_verified,
      riderVerificationStatus: row.rider_verification_status ?? null,
      isBanned: !!row.is_suspended,
      banReason: row.suspension_reason ?? null,
      createdAt: new Date(row.created_at),
      trustScore: row.trust_score ?? 0,
      totalRides,
      completedRides,
      averageRating: row.average_rating ?? 0,
      cancellations: row.cancelled_rides_as_rider ?? 0,
      lateCancellations: row.late_cancellations_count ?? 0,
      noShows: row.no_show_count ?? 0,
      verificationImages: row.bike_image_url ? { bikePhoto: row.bike_image_url } : undefined,
      verificationDetails: row.bike_model ? { vehicleModel: row.bike_model } : undefined,
    };
  }
}

// Export singleton instance
export const usersRepo = new UsersRepository();
