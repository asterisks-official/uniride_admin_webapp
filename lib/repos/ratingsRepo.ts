import { supabase } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types';
import { auditRepo } from './auditRepo';

// Type aliases for cleaner code
type RatingRow = Database['public']['Tables']['ride_ratings']['Row'];
type RatingUpdate = Database['public']['Tables']['ride_ratings']['Update'];

// Rating interface
export interface Rating {
  id: string;
  rideId: string;
  raterUid: string;
  ratedUid: string;
  raterRole: 'rider' | 'passenger';
  rating: number;
  review: string | null;
  tags: string[] | null;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Filters for listing ratings
export interface RatingFilters {
  rideId?: string;
  userUid?: string;
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

// Rating patterns aggregated statistics
export interface RatingPatterns {
  totalRatings: number;
  averageRating: number;
  distribution: {
    oneStar: number;
    twoStar: number;
    threeStar: number;
    fourStar: number;
    fiveStar: number;
  };
  hiddenCount: number;
  recentLowRatings: number; // Count of ratings below 3 in last 30 days
  suspiciousPatterns: {
    hasMultipleOneStarFromSameUser: boolean;
    hasUnusuallyHighHiddenRate: boolean;
  };
}

/**
 * Repository for managing rating operations
 * Handles listing, hiding, deleting ratings and analyzing rating patterns
 */
export class RatingsRepository {
  /**
   * List ratings with optional filtering and pagination
   * @param filters - Optional filters to apply (ride ID or user UID)
   * @param pagination - Pagination parameters
   * @returns Paginated list of ratings
   */
  async listRatings(
    filters: RatingFilters = {},
    pagination: Pagination = { page: 1, pageSize: 50 }
  ): Promise<PaginatedResult<Rating>> {
    // Build the query with filters
    let query = supabase
      .from('ride_ratings')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.rideId) {
      query = query.eq('ride_id', filters.rideId);
    }

    if (filters.userUid) {
      // Filter by either rater or rated user
      query = query.or(`rater_uid.eq.${filters.userUid},rated_uid.eq.${filters.userUid}`);
    }

    // Apply pagination
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to list ratings:', error);
      throw new Error(`Failed to list ratings: ${error.message}`);
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pagination.pageSize);

    return {
      data: (data || []).map(this.mapRowToRating),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
    };
  }

  /**
   * Get a specific rating by composite key (ride_id, rater_uid)
   * @param rideId - The ride ID
   * @param raterUid - The rater user ID
   * @returns The rating or null if not found
   */
  async getRatingById(rideId: string, raterUid: string): Promise<Rating | null> {
    const { data, error } = await supabase
      .from('ride_ratings')
      .select('*')
      .eq('ride_id', rideId)
      .eq('rater_uid', raterUid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Failed to get rating:', error);
      throw new Error(`Failed to get rating: ${error.message}`);
    }

    return this.mapRowToRating(data);
  }

  /**
   * Hide a rating by setting is_visible to false
   * @param rideId - The ride ID
   * @param raterUid - The rater user ID
   * @param adminUid - The admin performing the action
   */
  async hideRating(rideId: string, raterUid: string, adminUid: string): Promise<void> {
    // Get current rating for audit log
    const currentRating = await this.getRatingById(rideId, raterUid);
    
    if (!currentRating) {
      throw new Error('Rating not found');
    }

    // Update rating visibility
    const updateData: RatingUpdate = {
      is_visible: false,
    };

    const { error } = await supabase
      .from('ride_ratings')
      .update(updateData)
      .eq('ride_id', rideId)
      .eq('rater_uid', raterUid);

    if (error) {
      console.error('Failed to hide rating:', error);
      throw new Error(`Failed to hide rating: ${error.message}`);
    }

    // Log the action
    await auditRepo.logAction({
      adminUid,
      action: 'hide_rating',
      entityType: 'rating',
      entityId: `${rideId}:${raterUid}`,
      diff: {
        before: { isVisible: currentRating.isVisible },
        after: { isVisible: false },
      },
    });
  }

  /**
   * Permanently delete a rating
   * @param rideId - The ride ID
   * @param raterUid - The rater user ID
   * @param adminUid - The admin performing the action
   */
  async deleteRating(rideId: string, raterUid: string, adminUid: string): Promise<void> {
    // Get current rating for audit log
    const currentRating = await this.getRatingById(rideId, raterUid);
    
    if (!currentRating) {
      throw new Error('Rating not found');
    }

    // Delete the rating
    const { error } = await supabase
      .from('ride_ratings')
      .delete()
      .eq('ride_id', rideId)
      .eq('rater_uid', raterUid);

    if (error) {
      console.error('Failed to delete rating:', error);
      throw new Error(`Failed to delete rating: ${error.message}`);
    }

    // Log the action
    await auditRepo.logAction({
      adminUid,
      action: 'delete_rating',
      entityType: 'rating',
      entityId: `${rideId}:${raterUid}`,
      diff: {
        before: currentRating,
        after: null,
      },
    });
  }

  /**
   * Get aggregated rating patterns and statistics
   * @param userUid - Optional user UID to get patterns for specific user
   * @returns Aggregated rating statistics and abuse indicators
   */
  async getRatingPatterns(userUid?: string): Promise<RatingPatterns> {
    // Build base query
    let query = supabase.from('ride_ratings').select('*');

    // Filter by user if provided
    if (userUid) {
      query = query.eq('rated_uid', userUid);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get rating patterns:', error);
      throw new Error(`Failed to get rating patterns: ${error.message}`);
    }

    const ratings = data || [];
    const totalRatings = ratings.length;

    // Calculate average rating
    const averageRating = totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    // Calculate distribution
    const distribution = {
      oneStar: ratings.filter(r => r.rating === 1).length,
      twoStar: ratings.filter(r => r.rating === 2).length,
      threeStar: ratings.filter(r => r.rating === 3).length,
      fourStar: ratings.filter(r => r.rating === 4).length,
      fiveStar: ratings.filter(r => r.rating === 5).length,
    };

    // Count hidden ratings
    const hiddenCount = ratings.filter(r => !r.is_visible).length;

    // Count recent low ratings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLowRatings = ratings.filter(r => {
      const createdAt = new Date(r.created_at);
      return r.rating < 3 && createdAt >= thirtyDaysAgo;
    }).length;

    // Detect suspicious patterns
    const raterCounts = new Map<string, number>();
    ratings.forEach(r => {
      if (r.rating === 1) {
        raterCounts.set(r.rater_uid, (raterCounts.get(r.rater_uid) || 0) + 1);
      }
    });
    const hasMultipleOneStarFromSameUser = Array.from(raterCounts.values()).some(count => count > 2);

    const hiddenRate = totalRatings > 0 ? hiddenCount / totalRatings : 0;
    const hasUnusuallyHighHiddenRate = hiddenRate > 0.2; // More than 20% hidden

    return {
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      distribution,
      hiddenCount,
      recentLowRatings,
      suspiciousPatterns: {
        hasMultipleOneStarFromSameUser,
        hasUnusuallyHighHiddenRate,
      },
    };
  }

  /**
   * Map database row to Rating interface
   * @param row - Database row
   * @returns Formatted Rating object
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
      tags: row.review_tags,
      isVisible: row.is_visible,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Export singleton instance
export const ratingsRepo = new RatingsRepository();
