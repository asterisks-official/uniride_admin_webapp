'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/utils/apiClient';

interface RatingPatterns {
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
  recentLowRatings: number;
  suspiciousPatterns: {
    hasMultipleOneStarFromSameUser: boolean;
    hasUnusuallyHighHiddenRate: boolean;
  };
}

interface RatingPatternsProps {
  userUid?: string;
  rideId?: string;
}

export default function RatingPatterns({ userUid, rideId }: RatingPatternsProps) {
  const [patterns, setPatterns] = useState<RatingPatterns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatterns();
  }, [userUid, rideId]);

  const fetchPatterns = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (userUid) params.append('userUid', userUid);
      if (rideId) params.append('rideId', rideId);

      const response = await apiFetch(`/api/ratings/patterns?${params.toString()}`);
      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to fetch rating patterns');
      }

      setPatterns(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Rating Patterns</h2>
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !patterns) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Rating Patterns</h2>
        <p className="text-red-600 text-center py-4">{error || 'Failed to load patterns'}</p>
      </div>
    );
  }

  const getDistributionPercentage = (count: number) => {
    if (patterns.totalRatings === 0) return 0;
    return Math.round((count / patterns.totalRatings) * 100);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Rating Patterns & Analysis</h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total Ratings</p>
          <p className="text-2xl font-bold text-blue-900">{patterns.totalRatings}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-600 font-medium">Average Rating</p>
          <p className="text-2xl font-bold text-green-900">
            {patterns.averageRating.toFixed(1)} ⭐
          </p>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-600 font-medium">Recent Low Ratings</p>
          <p className="text-2xl font-bold text-yellow-900">{patterns.recentLowRatings}</p>
          <p className="text-xs text-yellow-600">Last 30 days (below 3 stars)</p>
        </div>
      </div>

      {/* Distribution */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Rating Distribution</h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const key = `${['five', 'four', 'three', 'two', 'one'][5 - star]}Star` as keyof typeof patterns.distribution;
            const count = patterns.distribution[key];
            const percentage = getDistributionPercentage(count);

            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm font-medium w-16">{star} ⭐</span>
                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full flex items-center justify-end px-2 text-xs font-medium text-white ${
                      star >= 4 ? 'bg-green-500' : star === 3 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 0 && `${percentage}%`}
                  </div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hidden Ratings */}
      {patterns.hiddenCount > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-700">Hidden Ratings</p>
              <p className="text-xs text-gray-500">Ratings hidden by moderators</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{patterns.hiddenCount}</p>
          </div>
        </div>
      )}

      {/* Suspicious Patterns */}
      {(patterns.suspiciousPatterns.hasMultipleOneStarFromSameUser ||
        patterns.suspiciousPatterns.hasUnusuallyHighHiddenRate) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-sm font-semibold text-red-800 mb-2">⚠️ Suspicious Patterns Detected</h3>
          <ul className="space-y-1 text-sm text-red-700">
            {patterns.suspiciousPatterns.hasMultipleOneStarFromSameUser && (
              <li>• Multiple 1-star ratings from the same user detected</li>
            )}
            {patterns.suspiciousPatterns.hasUnusuallyHighHiddenRate && (
              <li>• Unusually high rate of hidden ratings (over 20%)</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
