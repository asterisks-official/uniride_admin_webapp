'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { StatCard } from '@/components/cards/StatCard';
import { TrustDistributionChart } from '@/components/charts/TrustScoreChart';
import Link from 'next/link';
import {
  UsersIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  BellAlertIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/outline';
import { Sparkline } from '@/components/charts/Sparkline';

interface DashboardStats {
  totalUsers: number;
  activeRides: number;
  pendingRequests: number;
  unresolvedReports: number;
  pendingVerifications: number;
  unreadNotifications: number;
}

interface TrustDistribution {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

interface ActivityItem {
  id: string;
  type: 'user' | 'ride' | 'request' | 'report' | 'verification';
  action: string;
  description: string;
  timestamp: Date;
  link?: string;
}

interface Metrics {
  ridesSeries: Array<{ date: string; created: number; completed: number; cancelled: number }>;
  earningsSeries: Array<{ date: string; total: number; platformFee: number }>;
  completionRate30d: number;
  avgRating30d: number;
  rangeDays: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trustDistribution, setTrustDistribution] = useState<TrustDistribution | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [days]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      // Fetch dashboard stats
      const statsResponse = await fetch(`/api/dashboard/stats?days=${days}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const statsData = await statsResponse.json();
      if (statsData.ok) {
        setStats(statsData.data.stats);
        setTrustDistribution(statsData.data.trustDistribution);
        setRecentActivity(statsData.data.recentActivity.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        })));
        setMetrics(statsData.data.metrics);
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return UsersIcon;
      case 'ride':
        return TruckIcon;
      case 'request':
        return ClipboardDocumentListIcon;
      case 'report':
        return ExclamationTriangleIcon;
      case 'verification':
        return ShieldCheckIcon;
      default:
        return BellAlertIcon;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here&apos;s what&apos;s happening with UniRide today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={UsersIcon}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Active Rides"
          value={stats?.activeRides ?? 0}
          icon={TruckIcon}
          color="green"
          loading={loading}
        />
        <StatCard
          title="Pending Requests"
          value={stats?.pendingRequests ?? 0}
          icon={ClipboardDocumentListIcon}
          color="yellow"
          loading={loading}
        />
        <StatCard
          title="Unresolved Reports"
          value={stats?.unresolvedReports ?? 0}
          icon={ExclamationTriangleIcon}
          color="red"
          loading={loading}
        />
        <StatCard
          title="Pending Verifications"
          value={stats?.pendingVerifications ?? 0}
          icon={ShieldCheckIcon}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="Unread Notifications"
          value={stats?.unreadNotifications ?? 0}
          icon={BellAlertIcon}
          color="gray"
          loading={loading}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatCard
          title="Completion Rate (30d)"
          value={metrics?.completionRate30d ?? 0}
          icon={ShieldCheckIcon}
          color="green"
          loading={loading}
        />
        <StatCard
          title="Avg Rating (30d)"
          value={metrics?.avgRating30d ?? 0}
          icon={StarIcon}
          color="yellow"
          loading={loading}
        />
      </div>

      {/* Activity & Earnings */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Activity & Earnings</h3>
            {loading && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Range</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              onBlur={fetchDashboardData}
              className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
        </div>

        {loading || !metrics ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Rides</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600"></span>Created</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600"></span>Completed</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600"></span>Cancelled</span>
                </div>
              </div>
              <div className="flex gap-4 items-end">
                <Sparkline values={metrics.ridesSeries.map((d) => d.created)} colorClass="stroke-blue-600" fillClass="fill-blue-600" />
                <Sparkline values={metrics.ridesSeries.map((d) => d.completed)} colorClass="stroke-green-600" fillClass="fill-green-600" />
                <Sparkline values={metrics.ridesSeries.map((d) => d.cancelled)} colorClass="stroke-red-600" fillClass="fill-red-600" />
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Earnings</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-600"></span>Total</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600"></span>Platform Fee</span>
                </div>
              </div>
              <div className="flex gap-4 items-end">
                <Sparkline values={metrics.earningsSeries.map((d) => d.total)} colorClass="stroke-purple-600" fillClass="fill-purple-600" />
                <Sparkline values={metrics.earningsSeries.map((d) => d.platformFee)} colorClass="stroke-gray-600" fillClass="fill-gray-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Trust Score Distribution */}
        <div>
          {loading ? (
            <div className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ) : trustDistribution ? (
            <TrustDistributionChart distribution={trustDistribution} />
          ) : null}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/users?verificationStatus=pending"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <ShieldCheckIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Review Verifications</p>
                  <p className="text-sm text-gray-500">
                    {stats?.pendingVerifications ?? 0} pending
                  </p>
                </div>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            </Link>

            <Link
              href="/reports?status=pending"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Triage Reports</p>
                  <p className="text-sm text-gray-500">
                    {stats?.unresolvedReports ?? 0} unresolved
                  </p>
                </div>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            </Link>

            <Link
              href="/requests?status=pending"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Review Requests</p>
                  <p className="text-sm text-gray-500">
                    {stats?.pendingRequests ?? 0} pending
                  </p>
                </div>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            </Link>

            <Link
              href="/rides?status=active"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <TruckIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Monitor Rides</p>
                  <p className="text-sm text-gray-500">
                    {stats?.activeRides ?? 0} active
                  </p>
                </div>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            </Link>

            <Link
              href="/users"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <UsersIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Manage Users</p>
                  <p className="text-sm text-gray-500">
                    {stats?.totalUsers ?? 0} total
                  </p>
                </div>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentActivity.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {recentActivity.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              
              return (
                <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                  {activity.link ? (
                    <Link href={activity.link} className="flex items-start gap-4 group">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <BellAlertIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
