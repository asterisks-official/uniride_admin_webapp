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

    // Fetch all stats in parallel
    const [
      totalUsersResult,
      activeRidesResult,
      pendingRequestsResult,
      unresolvedReportsResult,
      pendingVerificationsResult,
      trustDistributionResult,
      recentActivityResult,
    ] = await Promise.allSettled([
      getTotalUsers(),
      getActiveRides(),
      getPendingRequests(),
      getUnresolvedReports(),
      getPendingVerifications(),
      getTrustDistribution(),
      getRecentActivity(),
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

    return NextResponse.json({
      ok: true,
      data: {
        stats,
        trustDistribution,
        recentActivity,
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
    .from('user_stats')
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
  const { count, error } = await supabase
    .from('rides')
    .select('*', { count: 'exact', head: true })
    .in('status', ['active', 'matched', 'confirmed', 'ongoing']);

  if (error) {
    console.error('Failed to count active rides:', error);
    return 0;
  }

  return count ?? 0;
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
  const { data, error } = await supabase
    .from('user_stats')
    .select('trust_score');

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
