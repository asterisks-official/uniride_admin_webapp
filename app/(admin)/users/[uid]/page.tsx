'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TrustScoreBreakdown from '@/components/TrustScoreBreakdown';
import RatingPatterns from '@/components/RatingPatterns';
import { apiFetch } from '@/lib/utils/apiClient';

interface User {
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
  trustScore: number;
  totalRides: number;
  completedRides: number;
  averageRating: number;
  cancellations: number;
  lateCancellations: number;
  noShows: number;
  createdAt: string;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const uid = params.uid as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Form states
  const [verifyApproved, setVerifyApproved] = useState(true);
  const [verifyNote, setVerifyNote] = useState('');
  const [banReason, setBanReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [uid]);

  const fetchUser = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/users/${uid}`);
      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to fetch user');
      }

      setUser(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRider = async () => {
    setActionLoading(true);

    try {
      const response = await apiFetch(`/api/users/${uid}/verify-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: verifyApproved,
          note: verifyNote || undefined,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to verify rider');
      }

      alert(result.data.message);
      setShowVerifyModal(false);
      setVerifyNote('');
      fetchUser();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!banReason.trim()) {
      alert('Please provide a ban reason');
      return;
    }

    setActionLoading(true);

    try {
      const response = await apiFetch(`/api/users/${uid}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: banReason }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to ban user');
      }

      alert(result.data.message);
      setShowBanModal(false);
      setBanReason('');
      fetchUser();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setActionLoading(true);

    try {
      const response = await apiFetch(`/api/users/${uid}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to delete user');
      }

      alert(result.data.message);
      router.push('/users');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrustScoreCategory = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'User not found'}</p>
          <button
            onClick={() => router.push('/users')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/users')}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
            >
              ← Back to Users
            </button>
            <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
          </div>
          <div className="flex gap-2">
            {user.riderVerificationStatus === 'pending' && (
              <button
                onClick={() => setShowVerifyModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Verify Rider
              </button>
            )}
            {!user.isBanned && (
              <button
                onClick={() => setShowBanModal(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                Ban User
              </button>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete User
            </button>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              {user.photoURL ? (
                <img
                  className="h-24 w-24 rounded-full"
                  src={user.photoURL}
                  alt=""
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-600 text-3xl font-medium">
                    {user.displayName?.[0] || user.email?.[0] || '?'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {user.displayName || 'No name'}
              </h2>
              <p className="text-gray-600">{user.email}</p>
              {user.phoneNumber && (
                <p className="text-gray-600">{user.phoneNumber}</p>
              )}
              <div className="mt-4 flex gap-2">
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                  {user.role}
                </span>
                {user.isRiderVerified && (
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                    Verified Rider
                  </span>
                )}
                {user.isBanned && (
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                    Banned
                  </span>
                )}
              </div>
              {user.isBanned && user.banReason && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm font-medium text-red-800">Ban Reason:</p>
                  <p className="text-sm text-red-700">{user.banReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trust Score Breakdown */}
        <TrustScoreBreakdown uid={uid} />

        {/* Rating Patterns */}
        <div className="mb-6">
          <RatingPatterns userUid={uid} />
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Rides</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{user.totalRides}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Completed Rides</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{user.completedRides}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Average Rating</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {user.averageRating.toFixed(1)} ⭐
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Completion Rate</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {user.totalRides > 0
                ? Math.round((user.completedRides / user.totalRides) * 100)
                : 0}%
            </p>
          </div>
        </div>

        {/* Reliability Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Reliability Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Cancellations</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{user.cancellations}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Late Cancellations</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{user.lateCancellations}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">No Shows</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{user.noShows}</p>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        {user.riderVerificationStatus && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Rider Verification</h3>
            <div className="flex items-center gap-4">
              <span className={`px-4 py-2 text-sm font-semibold rounded-full ${
                user.riderVerificationStatus === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : user.riderVerificationStatus === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user.riderVerificationStatus.toUpperCase()}
              </span>
              <p className="text-gray-600">
                {user.riderVerificationStatus === 'pending' && 'Awaiting admin review'}
                {user.riderVerificationStatus === 'approved' && 'Verified to offer rides'}
                {user.riderVerificationStatus === 'rejected' && 'Not approved to offer rides'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Verify Rider Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Verify Rider</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decision
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={verifyApproved}
                    onChange={() => setVerifyApproved(true)}
                    className="mr-2"
                  />
                  Approve
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!verifyApproved}
                    onChange={() => setVerifyApproved(false)}
                    className="mr-2"
                  />
                  Reject
                </label>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note (Optional)
              </label>
              <textarea
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a note about this decision..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setVerifyNote('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyRider}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban User Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Ban User</h3>
            <p className="text-gray-600 mb-4">
              This will disable the user&apos;s account and prevent them from accessing the platform.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ban Reason *
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Explain why this user is being banned..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setBanReason('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBanUser}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Delete User</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this user? This action will soft-delete the user
              and disable their account. This action cannot be easily undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
