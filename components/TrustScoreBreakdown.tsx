'use client';

import { useState, useEffect } from 'react';

interface TrustBreakdown {
  total: number;
  category: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  components: {
    rating: number;
    completion: number;
    reliability: number;
    experience: number;
  };
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

interface TrustScoreBreakdownProps {
  uid: string;
}

export default function TrustScoreBreakdown({ uid }: TrustScoreBreakdownProps) {
  const [breakdown, setBreakdown] = useState<TrustBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    fetchBreakdown();
  }, [uid]);

  const fetchBreakdown = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${uid}/trust/breakdown`);
      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to fetch trust breakdown');
      }

      setBreakdown(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!confirm('Are you sure you want to recalculate this user\'s trust score? This will update their score based on current statistics.')) {
      return;
    }

    setRecalculating(true);

    try {
      const response = await fetch(`/api/users/${uid}/trust/recalculate`, {
        method: 'POST',
      });
      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to recalculate trust score');
      }

      alert('Trust score recalculated successfully!');
      fetchBreakdown();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRecalculating(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Excellent':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Good':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Fair':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Poor':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getComponentColor = (points: number, max: number) => {
    const percentage = (points / max) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Loading trust score breakdown...</p>
        </div>
      </div>
    );
  }

  if (error || !breakdown) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error || 'Failed to load breakdown'}</p>
          <button
            onClick={fetchBreakdown}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Trust Score Breakdown</h3>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {recalculating ? 'Recalculating...' : 'Recalculate Score'}
        </button>
      </div>

      {/* Overall Score */}
      <div className={`border-2 rounded-lg p-4 mb-6 ${getCategoryColor(breakdown.category)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-75">Overall Trust Score</p>
            <p className="text-4xl font-bold mt-1">{breakdown.total} / 100</p>
          </div>
          <div className="text-right">
            <span className="px-4 py-2 text-lg font-bold rounded-lg bg-white bg-opacity-50">
              {breakdown.category}
            </span>
          </div>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="space-y-6">
        {/* Rating Component (0-30) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Rating Score</h4>
            <span className="text-lg font-bold text-gray-900">
              {breakdown.components.rating} / 30
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full ${getComponentColor(breakdown.components.rating, 30)}`}
              style={{ width: `${(breakdown.components.rating / 30) * 100}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600">
            <p>Average Rating: {breakdown.calculations.rating.averageRating.toFixed(2)} / 5.0</p>
            <p>Total Ratings: {breakdown.calculations.rating.totalRatings}</p>
          </div>
        </div>

        {/* Completion Component (0-25) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Completion Score</h4>
            <span className="text-lg font-bold text-gray-900">
              {breakdown.components.completion} / 25
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full ${getComponentColor(breakdown.components.completion, 25)}`}
              style={{ width: `${(breakdown.components.completion / 25) * 100}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600">
            <p>Completion Rate: {breakdown.calculations.completion.completionRate.toFixed(1)}%</p>
            <p>
              Completed: {breakdown.calculations.completion.completedRides} / {breakdown.calculations.completion.totalRides} rides
            </p>
          </div>
        </div>

        {/* Reliability Component (0-25) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Reliability Score</h4>
            <span className="text-lg font-bold text-gray-900">
              {breakdown.components.reliability} / 25
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full ${getComponentColor(breakdown.components.reliability, 25)}`}
              style={{ width: `${(breakdown.components.reliability / 25) * 100}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600">
            <p>Cancellations: {breakdown.calculations.reliability.cancellations}</p>
            <p>Late Cancellations: {breakdown.calculations.reliability.lateCancellations}</p>
            <p>No Shows: {breakdown.calculations.reliability.noShows}</p>
            <p className="text-red-600 font-medium">
              Total Deductions: -{breakdown.calculations.reliability.deductions} points
            </p>
          </div>
        </div>

        {/* Experience Component (0-20) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Experience Score</h4>
            <span className="text-lg font-bold text-gray-900">
              {breakdown.components.experience} / 20
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full ${getComponentColor(breakdown.components.experience, 20)}`}
              style={{ width: `${(breakdown.components.experience / 20) * 100}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600">
            <p>Total Rides: {breakdown.calculations.experience.totalRides}</p>
            <p className="text-xs text-gray-500 mt-1">
              0 rides = 0pts | 1-5 = 5pts | 6-15 = 10pts | 16-30 = 15pts | 31+ = 20pts
            </p>
          </div>
        </div>
      </div>

      {/* Calculation Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">Calculation Summary</h4>
        <div className="text-sm text-gray-700 space-y-1">
          <div className="flex justify-between">
            <span>Rating Component:</span>
            <span className="font-medium">{breakdown.components.rating} pts</span>
          </div>
          <div className="flex justify-between">
            <span>Completion Component:</span>
            <span className="font-medium">{breakdown.components.completion} pts</span>
          </div>
          <div className="flex justify-between">
            <span>Reliability Component:</span>
            <span className="font-medium">{breakdown.components.reliability} pts</span>
          </div>
          <div className="flex justify-between">
            <span>Experience Component:</span>
            <span className="font-medium">{breakdown.components.experience} pts</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-300 font-bold">
            <span>Total Score:</span>
            <span>{breakdown.total} / 100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
