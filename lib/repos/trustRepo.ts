import { supabase } from '@/lib/supabase/server';
import { auditRepo } from './auditRepo';

// Type definitions
export interface UserTrust {
  uid: string;
  email: string | null;
  displayName: string | null;
  trustScore: number;
  category: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  totalRides: number;
  completedRides: number;
  averageRating: number;
}

export interface TrustFilters {
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

export interface TrustScore {
  total: number; // 0-100
  category: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  components: {
    rating: number;      // 0-30
    completion: number;  // 0-25
    reliability: number; // 0-25
    experience: number;  // 0-20
  };
}

export interface TrustBreakdown extends TrustScore {
  userUid: string;
  calculations: {
    rating: {
      averageRating: number;
      totalRatings: number;
      points: number;
    };
    completion: {
      completionRate: number;
      completedRides: number;
      totalRides: number;
      points: number;
    };
    reliability: {
      cancellations: number;
      lateCancellations: number;
      noShows: number;
      deductions: number;
      points: number;
    };
    experience: {
      totalRides: number;
      points: number;
    };
  };
}

interface UserStats {
  user_uid: string;
  trust_score: number;
  total_rides_as_rider: number;
  total_rides_as_passenger: number;
  completed_rides_as_rider: number;
  completed_rides_as_passenger: number;
  cancelled_rides_as_rider: number;
  cancelled_rides_as_passenger: number;
  average_rating_as_rider: number;
  average_rating_as_passenger: number;
  total_ratings_received_as_rider: number;
  total_ratings_received_as_passenger: number;
  late_cancellations_count: number;
  no_show_count: number;
  total_earnings: number;
}

/**
 * Repository for managing trust score operations
 * Handles trust score calculations, rankings, and recalculations
 */
export class TrustRepository {
  /**
   * Get trust score rankings with filters and pagination
   * @param filters - Optional filters for min/max trust score
   * @param pagination - Pagination parameters
   * @returns Paginated list of users with trust scores
   */
  async getTrustRanking(
    filters: TrustFilters = {},
    pagination: Pagination = { page: 1, pageSize: 50 }
  ): Promise<PaginatedResult<UserTrust>> {
    // Build query with filters
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

    // Apply pagination and ordering
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    query = query
      .order('trust_score', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to get trust rankings:', error);
      throw new Error(`Failed to get trust rankings: ${error.message}`);
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pagination.pageSize);

    // Map to UserTrust with category
    const userTrusts = await Promise.all(
      (data || []).map(stat => this.mapStatsToUserTrust(stat))
    );

    return {
      data: userTrusts,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
    };
  }

  /**
   * Get detailed trust score breakdown for a user
   * @param uid - User UID
   * @returns Detailed trust score breakdown with calculations
   */
  async getTrustBreakdown(uid: string): Promise<TrustBreakdown> {
    // Fetch user stats
    const { data: stats, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_uid', uid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('User stats not found');
      }
      console.error('Failed to get user stats:', error);
      throw new Error(`Failed to get user stats: ${error.message}`);
    }

    // Calculate trust score with detailed breakdown
    return this.calculateTrustScoreDetailed(stats);
  }

  /**
   * Recalculate trust score for a user and update database
   * Uses the database function update_user_trust_score for consistent calculation
   * @param uid - User UID
   * @param adminUid - Admin performing the recalculation
   * @returns Updated trust score
   */
  async recalculateTrustScore(uid: string, adminUid: string): Promise<TrustScore> {
    // Get current stats before recalculation
    const { data: currentStats, error: fetchError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_uid', uid)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('User stats not found');
      }
      throw new Error(`Failed to fetch user stats: ${fetchError.message}`);
    }

    const oldTrustScore = currentStats.trust_score;

    // Call database function to recalculate trust score
    const { data: newTrustScoreValue, error: rpcError } = await supabase
      .rpc('update_user_trust_score', { p_user_uid: uid });

    if (rpcError) {
      throw new Error(`Failed to recalculate trust score: ${rpcError.message}`);
    }

    // Fetch updated stats to get the breakdown
    const { data: updatedStats, error: updatedFetchError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_uid', uid)
      .single();

    if (updatedFetchError) {
      throw new Error(`Failed to fetch updated stats: ${updatedFetchError.message}`);
    }

    // Calculate breakdown using the same formula as database
    const newTrustScore = this.calculateTrustScore(updatedStats);

    // Log audit action
    await auditRepo.logAction({
      adminUid,
      action: 'recalculate_trust_score',
      entityType: 'user',
      entityId: uid,
      diff: {
        before: {
          trustScore: oldTrustScore,
        },
        after: {
          trustScore: newTrustScoreValue,
          components: newTrustScore.components,
        },
      },
    });

    return newTrustScore;
  }

  /**
   * Get trust score outliers
   * @param below - Minimum threshold (users below this score)
   * @param above - Maximum threshold (users above this score)
   * @returns List of users outside the specified thresholds
   */
  async getTrustOutliers(below?: number, above?: number): Promise<UserTrust[]> {
    let query = supabase.from('user_stats').select('*');

    // Build OR condition for outliers
    if (below !== undefined && above !== undefined) {
      query = query.or(`trust_score.lt.${below},trust_score.gt.${above}`);
    } else if (below !== undefined) {
      query = query.lt('trust_score', below);
    } else if (above !== undefined) {
      query = query.gt('trust_score', above);
    } else {
      // No filters provided, return empty array
      return [];
    }

    query = query.order('trust_score', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get trust outliers:', error);
      throw new Error(`Failed to get trust outliers: ${error.message}`);
    }

    // Map to UserTrust
    const outliers = await Promise.all(
      (data || []).map(stat => this.mapStatsToUserTrust(stat))
    );

    return outliers;
  }

  /**
   * Calculate trust score from user stats using the same formula as the database function
   * This ensures consistency between client-side display and database calculations
   * @param stats - User statistics
   * @returns Trust score with components
   */
  private calculateTrustScore(stats: UserStats): TrustScore {
    // Aggregate stats from rider and passenger roles
    const totalRatingsCount = stats.total_ratings_received_as_rider + stats.total_ratings_received_as_passenger;
    const totalRides = stats.total_rides_as_rider + stats.total_rides_as_passenger;
    const completedRides = stats.completed_rides_as_rider + stats.completed_rides_as_passenger;
    const cancelledRides = stats.cancelled_rides_as_rider + stats.cancelled_rides_as_passenger;
    
    // Calculate weighted average rating
    const avgRating = totalRatingsCount > 0
      ? ((stats.average_rating_as_rider * stats.total_ratings_received_as_rider +
          stats.average_rating_as_passenger * stats.total_ratings_received_as_passenger) /
         totalRatingsCount)
      : 0;

    const components = {
      rating: this.calculateRatingScore(avgRating, totalRatingsCount),
      completion: this.calculateCompletionScore(completedRides, totalRides),
      reliability: this.calculateReliabilityScore(
        cancelledRides,
        stats.late_cancellations_count,
        stats.no_show_count
      ),
      experience: this.calculateExperienceScore(totalRides),
    };

    const total = Math.round(
      components.rating + components.completion + components.reliability + components.experience
    );

    return {
      total: Math.min(100, Math.max(0, total)),
      category: this.getTrustCategory(total),
      components,
    };
  }

  /**
   * Calculate detailed trust score breakdown
   * Uses split fields from unified schema (rider/passenger stats)
   * @param stats - User statistics
   * @returns Detailed trust breakdown with calculations
   */
  private calculateTrustScoreDetailed(stats: UserStats): TrustBreakdown {
    const trustScore = this.calculateTrustScore(stats);

    // Aggregate stats from rider and passenger roles
    const totalRatingsCount = stats.total_ratings_received_as_rider + stats.total_ratings_received_as_passenger;
    const totalRides = stats.total_rides_as_rider + stats.total_rides_as_passenger;
    const completedRides = stats.completed_rides_as_rider + stats.completed_rides_as_passenger;
    const cancelledRides = stats.cancelled_rides_as_rider + stats.cancelled_rides_as_passenger;
    
    // Calculate weighted average rating
    const avgRating = totalRatingsCount > 0
      ? ((stats.average_rating_as_rider * stats.total_ratings_received_as_rider +
          stats.average_rating_as_passenger * stats.total_ratings_received_as_passenger) /
         totalRatingsCount)
      : 0;

    // Calculate rating details
    const ratingPoints = this.calculateRatingScore(avgRating, totalRatingsCount);
    
    // Calculate completion details
    const completionRate = totalRides > 0 
      ? (completedRides / totalRides) * 100 
      : 0;
    const completionPoints = this.calculateCompletionScore(completedRides, totalRides);

    // Calculate reliability details
    const reliabilityDeductions = this.calculateReliabilityDeductions(
      cancelledRides,
      stats.late_cancellations_count,
      stats.no_show_count
    );
    const reliabilityPoints = this.calculateReliabilityScore(
      cancelledRides,
      stats.late_cancellations_count,
      stats.no_show_count
    );

    // Calculate experience details
    const experiencePoints = this.calculateExperienceScore(totalRides);

    return {
      ...trustScore,
      userUid: stats.user_uid,
      calculations: {
        rating: {
          averageRating: avgRating,
          totalRatings: totalRatingsCount,
          points: ratingPoints,
        },
        completion: {
          completionRate,
          completedRides: completedRides,
          totalRides: totalRides,
          points: completionPoints,
        },
        reliability: {
          cancellations: cancelledRides,
          lateCancellations: stats.late_cancellations_count,
          noShows: stats.no_show_count,
          deductions: reliabilityDeductions,
          points: reliabilityPoints,
        },
        experience: {
          totalRides: totalRides,
          points: experiencePoints,
        },
      },
    };
  }

  /**
   * Calculate rating component score (0-30 points)
   * Based on average rating (1-5 scale)
   * Matches database function: avg_rating × 6, or 15 for new users
   */
  private calculateRatingScore(averageRating: number, totalRatingsCount: number): number {
    if (totalRatingsCount === 0) return 15; // New user bonus
    // Map rating to 0-30 points: rating × 6
    return Math.min(Math.round(averageRating * 6), 30);
  }

  /**
   * Calculate completion component score (0-25 points)
   * Based on completion rate
   * Matches database function: (completed/total) × 25, or 20 for new users
   */
  private calculateCompletionScore(completedRides: number, totalRides: number): number {
    if (totalRides === 0) return 20; // New user bonus
    const completionRate = completedRides / totalRides;
    // 100% completion = 25 points
    return Math.round(completionRate * 25);
  }

  /**
   * Calculate reliability component score (0-25 points)
   * Starts at 25 and deducts for negative behaviors
   * Matches database function: 25 - (cancellations×2) - (late_cancellations×5) - (no_shows×10)
   */
  private calculateReliabilityScore(
    cancellations: number,
    lateCancellations: number,
    noShows: number
  ): number {
    const deductions = this.calculateReliabilityDeductions(
      cancellations,
      lateCancellations,
      noShows
    );
    
    // Start with 25 points, deduct based on negative behaviors
    const score = 25 - deductions;
    return Math.max(0, score);
  }

  /**
   * Calculate reliability deductions
   * Matches database function penalties: cancellations×2, late_cancellations×5, no_shows×10
   */
  private calculateReliabilityDeductions(
    cancellations: number,
    lateCancellations: number,
    noShows: number
  ): number {
    // Deduction weights matching database function
    const cancellationPenalty = 2;
    const lateCancellationPenalty = 5;
    const noShowPenalty = 10;

    return (
      cancellations * cancellationPenalty +
      lateCancellations * lateCancellationPenalty +
      noShows * noShowPenalty
    );
  }

  /**
   * Calculate experience component score (0-20 points)
   * Based on total number of rides
   * Matches database function: 10 for new users, 20 for 10+ rides, scaled between
   */
  private calculateExperienceScore(totalRides: number): number {
    // Progressive scale matching database function:
    // 0 rides = 10 points (new user bonus)
    // 1-9 rides = 10 + totalRides points (11-19)
    // 10+ rides = 20 points
    if (totalRides === 0) return 10;
    if (totalRides >= 10) return 20;
    return 10 + totalRides;
  }

  /**
   * Get trust category based on total score
   */
  private getTrustCategory(score: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  }

  /**
   * Map user stats to UserTrust interface
   * Fetches user details from Firebase Auth
   * Aggregates rider and passenger stats from unified schema
   */
  private async mapStatsToUserTrust(stats: UserStats): Promise<UserTrust> {
    // Import authAdmin dynamically to avoid circular dependencies
    const { authAdmin } = await import('@/lib/firebase/admin');
    
    let email: string | null = null;
    let displayName: string | null = null;

    try {
      const userRecord = await authAdmin.getUser(stats.user_uid);
      email = userRecord.email || null;
      displayName = userRecord.displayName || null;
    } catch (error) {
      console.error(`Failed to fetch user details for ${stats.user_uid}:`, error);
    }

    const trustScore = this.calculateTrustScore(stats);

    // Aggregate rider and passenger stats
    const totalRides = stats.total_rides_as_rider + stats.total_rides_as_passenger;
    const completedRides = stats.completed_rides_as_rider + stats.completed_rides_as_passenger;
    const totalRatingsCount = stats.total_ratings_received_as_rider + stats.total_ratings_received_as_passenger;
    
    // Calculate weighted average rating
    const averageRating = totalRatingsCount > 0
      ? ((stats.average_rating_as_rider * stats.total_ratings_received_as_rider +
          stats.average_rating_as_passenger * stats.total_ratings_received_as_passenger) /
         totalRatingsCount)
      : 0;

    return {
      uid: stats.user_uid,
      email,
      displayName,
      trustScore: stats.trust_score,
      category: trustScore.category,
      totalRides: totalRides,
      completedRides: completedRides,
      averageRating: averageRating,
    };
  }
}

// Export singleton instance
export const trustRepo = new TrustRepository();
