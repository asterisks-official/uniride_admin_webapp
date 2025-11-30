import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin, extractToken } from '@/lib/security/authGuard';
import { usersRepo } from '@/lib/repos/usersRepo';
import { ridesRepo } from '@/lib/repos/ridesRepo';
import { requestsRepo } from '@/lib/repos/requestsRepo';
import { reportsRepo } from '@/lib/repos/reportsRepo';
import { supabase } from '@/lib/supabase/server';
import { firestoreAdmin } from '@/lib/firebase/admin';

/**
 * GET /api/dashboard/stats
 * Fetch dashboard statistics including counts and recent activity
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'No authentication token provided' } },
        { status: 401 }
      );
    }

    await assertAdmin(token);

    const searchParams = request.nextUrl.searchParams;
    const daysParam = Number(searchParams.get('days') || '7');
    const rangeDays = Number.isFinite(daysParam) ? Math.min(30, Math.max(7, daysParam)) : 7;

    // Fetch all stats in parallel
    const [
      totalUsersResult,
      activeRidesResult,
      pendingRequestsResult,
      unresolvedReportsResult,
      pendingVerificationsResult,
      trustDistributionResult,
      recentActivityResult,
      rideSeriesResult,
      earningsSeriesResult,
      completionRateResult,
      avgRating30dResult,
    ] = await Promise.allSettled([
      getTotalUsers(),
      getActiveRides(),
      getPendingRequests(),
      getUnresolvedReports(),
      getPendingVerifications(),
      getTrustDistribution(),
      getRecentActivity(),
      getRideSeries(rangeDays),
      getEarningsSeries(rangeDays),
      getCompletionRate30d(),
      getAvgRating30d(),
    ]);

    // Extract values or use defaults
    const stats = {
      totalUsers: totalUsersResult.status === 'fulfilled' ? totalUsersResult.value : 0,
      activeRides: activeRidesResult.status === 'fulfilled' ? activeRidesResult.value : 0,
      pendingRequests: pendingRequestsResult.status === 'fulfilled' ? pendingRequestsResult.value : 0,
      unresolvedReports: unresolvedReportsResult.status === 'fulfilled' ? unresolvedReportsResult.value : 0,
      pendingVerifications: pendingVerificationsResult.status === 'fulfilled' ? pendingVerificationsResult.value : 0,
      unreadNotifications: 0, // Placeholder - would need notifications table query
    };

    const trustDistribution = trustDistributionResult.status === 'fulfilled' 
      ? trustDistributionResult.value 
      : { excellent: 0, good: 0, fair: 0, poor: 0 };

    const recentActivity = recentActivityResult.status === 'fulfilled' 
      ? recentActivityResult.value 
      : [];

    const metrics = {
      ridesSeries: rideSeriesResult.status === 'fulfilled' ? rideSeriesResult.value : [],
      earningsSeries: earningsSeriesResult.status === 'fulfilled' ? earningsSeriesResult.value : [],
      completionRate30d: completionRateResult.status === 'fulfilled' ? completionRateResult.value : 0,
      avgRating30d: avgRating30dResult.status === 'fulfilled' ? avgRating30dResult.value : 0,
      rangeDays,
    };

    return NextResponse.json({
      ok: true,
      data: {
        stats,
        trustDistribution,
        recentActivity,
        metrics,
      },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);

    if (error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard stats' } },
      { status: 500 }
    );
  }
}

/**
 * Get total number of users
 */
async function getTotalUsers(): Promise<number> {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Failed to count users:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Get number of active rides
 */
async function getActiveRides(): Promise<number> {
  try {
    // Primary attempt: use OR filter and lightweight select
    const { count, error } = await supabase
      .from('rides')
      .select('id', { count: 'exact', head: true })
      .or('status.eq.active,status.eq.matched,status.eq.confirmed,status.eq.ongoing');

    if (error) {
      console.warn('Active rides head-count failed, retrying without head:', error);
      // Fallback: retry without head to allow PostgREST to return count even if filters are complex
      const { count: retryCount, error: retryError } = await supabase
        .from('rides')
        .select('id', { count: 'exact' })
        .or('status.eq.active,status.eq.matched,status.eq.confirmed,status.eq.ongoing');

      if (retryError) {
        console.error('Failed to count active rides:', retryError);
        return 0;
      }
      return retryCount ?? 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error('Unexpected error counting active rides:', err);
    return 0;
  }
}

/**
 * Get number of pending ride requests
 */
async function getPendingRequests(): Promise<number> {
  const { count, error } = await supabase
    .from('ride_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    console.error('Failed to count pending requests:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Get number of unresolved reports
 */
async function getUnresolvedReports(): Promise<number> {
  const { count, error } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'escalated']);

  if (error) {
    console.error('Failed to count unresolved reports:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Get number of pending rider verifications
 */
async function getPendingVerifications(): Promise<number> {
  try {
    // Check if firestoreAdmin is properly initialized
    if (!firestoreAdmin) {
      console.warn('Firestore Admin not initialized, skipping pending verifications count');
      return 0;
    }

    // Query Firestore for pending rider verifications
    const usersCollection = firestoreAdmin.collection('users');
    const snapshot = await usersCollection
      .where('riderVerificationStatus', '==', 'pending')
      .count()
      .get();

    return snapshot.data().count;
  } catch (error: any) {
    console.error('Failed to count pending verifications:', error?.message || error);
    // Return 0 instead of throwing to prevent dashboard from breaking
    return 0;
  }
}

/**
 * Get trust score distribution
 */
async function getTrustDistribution(): Promise<{
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}> {
  // Query from user_stats where trust_score exists
  // Users without stats (new users) won't have trust scores yet
  const { data, error } = await supabase
    .from('user_stats')
    .select('trust_score')
    .not('trust_score', 'is', null);

  if (error) {
    console.error('Failed to fetch trust scores:', error);
    return { excellent: 0, good: 0, fair: 0, poor: 0 };
  }

  const distribution = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
  };

  (data || []).forEach((user: any) => {
    const score = user.trust_score;
    if (score >= 80) {
      distribution.excellent++;
    } else if (score >= 60) {
      distribution.good++;
    } else if (score >= 40) {
      distribution.fair++;
    } else {
      distribution.poor++;
    }
  });

  return distribution;
}

/**
 * Get recent activity from audit log
 */
async function getRecentActivity(): Promise<any[]> {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Failed to fetch recent activity:', error);
    return [];
  }

  return (data || []).map((log: any) => {
    let action = '';
    let description = '';
    let link = '';

    switch (log.action) {
      case 'verify_rider_approved':
        action = 'Rider Verified';
        description = `Approved rider verification for user ${log.entity_id}`;
        link = `/users/${log.entity_id}`;
        break;
      case 'verify_rider_rejected':
        action = 'Rider Verification Rejected';
        description = `Rejected rider verification for user ${log.entity_id}`;
        link = `/users/${log.entity_id}`;
        break;
      case 'ban_user':
        action = 'User Banned';
        description = `Banned user ${log.entity_id}`;
        link = `/users/${log.entity_id}`;
        break;
      case 'cancel_ride':
        action = 'Ride Cancelled';
        description = `Cancelled ride ${log.entity_id}`;
        link = `/rides/${log.entity_id}`;
        break;
      case 'force_complete_ride':
        action = 'Ride Force Completed';
        description = `Force completed ride ${log.entity_id}`;
        link = `/rides/${log.entity_id}`;
        break;
      case 'force_accept_request':
        action = 'Request Force Accepted';
        description = `Force accepted ride request ${log.entity_id}`;
        link = `/requests`;
        break;
      case 'force_decline_request':
        action = 'Request Force Declined';
        description = `Force declined ride request ${log.entity_id}`;
        link = `/requests`;
        break;
      case 'resolve_report':
        action = 'Report Resolved';
        description = `Resolved report ${log.entity_id}`;
        link = `/reports`;
        break;
      case 'escalate_report':
        action = 'Report Escalated';
        description = `Escalated report ${log.entity_id}`;
        link = `/reports`;
        break;
      case 'recalculate_trust_score':
        action = 'Trust Score Recalculated';
        description = `Recalculated trust score for user ${log.entity_id}`;
        link = `/users/${log.entity_id}`;
        break;
      default:
        action = log.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        description = `${log.action} on ${log.entity_type} ${log.entity_id}`;
        link = '';
    }

    return {
      id: log.id,
      type: log.entity_type,
      action,
      description,
      timestamp: log.created_at,
      link,
    };
  });
}

function getDateDaysAgo(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function getRideSeries(days: number): Promise<Array<{ date: string; created: number; completed: number; cancelled: number }>> {
  const startDate = getDateDaysAgo(days);
  const { data, error } = await supabase
    .from('rides')
    .select('created_at, completed_at, cancelled_at')
    .gte('created_at', startDate.toISOString());
  if (error) return [];
  const series: Record<string, { created: number; completed: number; cancelled: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    series[formatDateKey(d)] = { created: 0, completed: 0, cancelled: 0 };
  }
  (data || []).forEach((row: any) => {
    const cKey = formatDateKey(new Date(row.created_at));
    if (series[cKey]) series[cKey].created++;
    if (row.completed_at) {
      const compKey = formatDateKey(new Date(row.completed_at));
      if (series[compKey]) series[compKey].completed++;
    }
    if (row.cancelled_at) {
      const canKey = formatDateKey(new Date(row.cancelled_at));
      if (series[canKey]) series[canKey].cancelled++;
    }
  });
  return Object.entries(series).map(([date, v]) => ({ date, ...v }));
}

async function getEarningsSeries(days: number): Promise<Array<{ date: string; total: number; platformFee: number }>> {
  const startDate = getDateDaysAgo(days);
  const { data, error } = await supabase
    .from('ride_transactions')
    .select('created_at, amount, platform_fee')
    .gte('created_at', startDate.toISOString());
  if (error) return [];
  const series: Record<string, { total: number; platformFee: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    series[formatDateKey(d)] = { total: 0, platformFee: 0 };
  }
  (data || []).forEach((row: any) => {
    const key = formatDateKey(new Date(row.created_at));
    if (!series[key]) return;
    series[key].total += Number(row.amount || 0);
    series[key].platformFee += Number(row.platform_fee || 0);
  });
  return Object.entries(series).map(([date, v]) => ({ date, ...v }));
}

async function getCompletionRate30d(): Promise<number> {
  const startDate = getDateDaysAgo(30);
  const { data, error } = await supabase
    .from('rides')
    .select('id, status, created_at')
    .gte('created_at', startDate.toISOString());
  if (error) return 0;
  const total = (data || []).length;
  const completed = (data || []).filter((r: any) => r.status === 'completed').length;
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

async function getAvgRating30d(): Promise<number> {
  const startDate = getDateDaysAgo(30);
  const { data, error } = await supabase
    .from('ride_ratings')
    .select('rating, created_at')
    .gte('created_at', startDate.toISOString());
  if (error) return 0;
  const ratings = (data || []).map((r: any) => Number(r.rating || 0));
  if (ratings.length === 0) return 0;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.round(avg * 10) / 10;
}
