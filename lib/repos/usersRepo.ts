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
   * Combines data from Firebase Auth, Firestore, and Supabase
   */
  async listUsers(
    filters: UserFilters = {},
    pagination: Pagination = { page: 1, pageSize: 50 }
  ): Promise<PaginatedResult<User>> {
    // Get user stats from Supabase with trust score filters
    let query = supabase
      .from('user_stats')
      .select('*', { count: 'exact' });

    // Apply trust score filters
    if (filters.trustMin !== undefined) {
      query = query.gte('trust_score', filters.trustMin);
    }
    if (filters.trustMax !== undefined) {
      query = query.lte('trust_score', filters.trustMax);
    }

    // Apply pagination
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data: statsData, error: statsError, count } = await query;

    if (statsError) {
      throw new Error(`Failed to fetch user stats: ${statsError.message}`);
    }

    const total = count ?? 0;

    // Get UIDs from stats
    const userUids = (statsData || []).map(stat => stat.user_uid);

    if (userUids.length === 0) {
      return {
        data: [],
        total: 0,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: 0,
      };
    }

    // Fetch user details from Firebase and Firestore
    const users = await Promise.all(
      userUids.map(uid => this.getUserByUid(uid))
    );

    // Filter out nulls and apply additional filters
    let filteredUsers = users.filter((user): user is User => user !== null);

    // Apply role filter
    if (filters.role) {
      filteredUsers = filteredUsers.filter(user => user.role === filters.role);
    }

    // Apply verification status filter
    if (filters.verificationStatus) {
      filteredUsers = filteredUsers.filter(
        user => user.riderVerificationStatus === filters.verificationStatus
      );
    }

    // Apply query filter (search in email, displayName)
    if (filters.query) {
      const queryLower = filters.query.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.email?.toLowerCase().includes(queryLower) ||
        user.displayName?.toLowerCase().includes(queryLower)
      );
    }

    const totalPages = Math.ceil(total / pagination.pageSize);

    return {
      data: filteredUsers,
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
    try {
      // Fetch from Firebase Auth
      const userRecord = await authAdmin.getUser(uid);

      // Fetch from Firestore for profile data
      const userDoc = await firestoreAdmin.collection('users').doc(uid).get();
      const userData = userDoc.data();

      // Fetch from Supabase for stats
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_uid', uid)
        .single();

      // If no stats exist, create default stats
      const stats = statsData || {
        trust_score: 0,
        total_rides: 0,
        completed_rides: 0,
        average_rating: 0,
        cancellations: 0,
        late_cancellations: 0,
        no_shows: 0,
      };

      return this.mapToUser(userRecord, userData, stats);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      console.error('Failed to get user:', error);
      throw new Error(`Failed to get user: ${error.message}`);
    }
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
    // Get current user data for audit log
    const beforeUser = await this.getUserByUid(uid);
    if (!beforeUser) {
      throw new Error('User not found');
    }

    // Update Firestore
    const userRef = firestoreAdmin.collection('users').doc(uid);
    const updateData: any = {
      riderVerificationStatus: approved ? 'approved' : 'rejected',
      isRiderVerified: approved,
      updatedAt: new Date(),
    };

    if (note) {
      updateData.verificationNote = note;
    }

    await userRef.update(updateData);

    // Get updated user data
    const afterUser = await this.getUserByUid(uid);

    // Log audit action
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

    // Soft delete: disable in Firebase Auth
    await authAdmin.updateUser(uid, {
      disabled: true,
    });

    // Mark as deleted in Firestore
    const userRef = firestoreAdmin.collection('users').doc(uid);
    await userRef.update({
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

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
        after: {
          isDeleted: true,
        },
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
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
      phoneNumber: userRecord.phoneNumber || null,
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
    };
  }
}

// Export singleton instance
export const usersRepo = new UsersRepository();
