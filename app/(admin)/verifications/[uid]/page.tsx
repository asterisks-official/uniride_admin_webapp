'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/utils/apiClient';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  role: string;
  isRiderVerified: boolean;
  riderVerificationStatus: string;
  createdAt: Date;
  trustScore: number;
  totalRides: number;
  completedRides: number;
  averageRating: number;
  cancellations: number;
  lateCancellations: number;
  noShows: number;
  isBanned: boolean;
  banReason: string | null;
  // Verification documents (Cloudinary URLs)
  verificationImages?: {
    bikePhoto?: string;
    licensePhoto?: string;
    registrationPhoto?: string;
    insurancePhoto?: string;
  };
  // Verification details
  verificationDetails?: {
    licenseNumber?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehiclePlate?: string;
  };
}

export default function VerificationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const uid = params.uid as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchUserDetails();
  }, [uid]);

  const fetchUserDetails = async () => {
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

  const handleApprove = async () => {
    setActionLoading(true);

    try {
      const response = await apiFetch(`/api/users/${uid}/verify-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: true,
          note: note.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to approve verification');
      }

      alert('Rider verification approved successfully!');
      router.push('/verifications');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!note.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);

    try {
      const response = await apiFetch(`/api/users/${uid}/verify-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: false,
          note: note.trim(),
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to reject verification');
      }

      alert('Rider verification rejected');
      router.push('/verifications');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading verification details...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'User not found'}</p>
          <button
            onClick={() => router.push('/verifications')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Verifications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/verifications')}
          className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
        >
          ← Back to Verifications
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Verification Review</h1>
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
              user.riderVerificationStatus
            )}`}
          >
            {user.riderVerificationStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">User Profile</h2>
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user.photoURL ? (
              <img
                className="h-24 w-24 rounded-full"
                src={user.photoURL}
                alt={user.displayName || 'User'}
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 font-bold text-3xl">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* User Details */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Name</p>
              <p className="text-gray-900">{user.displayName || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Email</p>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Phone Number</p>
              <p className="text-gray-900">{user.phoneNumber || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Role</p>
              <p className="text-gray-900 capitalize">{user.role}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">User ID</p>
              <p className="text-gray-900 font-mono text-xs">{user.uid}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Documents Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Verification Documents</h2>
        
        {user.verificationImages && Object.keys(user.verificationImages).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.verificationImages.bikePhoto && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Vehicle/Bike Photo</p>
                <img
                  src={user.verificationImages.bikePhoto}
                  alt="Vehicle/Bike"
                  className="w-full rounded-lg border border-gray-300 cursor-pointer hover:opacity-90"
                  onClick={() => window.open(user.verificationImages!.bikePhoto, '_blank')}
                />
              </div>
            )}
            
            {user.verificationImages.licensePhoto && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Driver&#39;s License</p>
                <img
                  src={user.verificationImages.licensePhoto}
                  alt="Driver&#39;s License"
                  className="w-full rounded-lg border border-gray-300 cursor-pointer hover:opacity-90"
                  onClick={() => window.open(user.verificationImages!.licensePhoto, '_blank')}
                />
              </div>
            )}
            
            {user.verificationImages.registrationPhoto && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Vehicle Registration</p>
                <img
                  src={user.verificationImages.registrationPhoto}
                  alt="Vehicle Registration"
                  className="w-full rounded-lg border border-gray-300 cursor-pointer hover:opacity-90"
                  onClick={() => window.open(user.verificationImages!.registrationPhoto, '_blank')}
                />
              </div>
            )}
            
            {user.verificationImages.insurancePhoto && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Insurance Certificate</p>
                <img
                  src={user.verificationImages.insurancePhoto}
                  alt="Insurance Certificate"
                  className="w-full rounded-lg border border-gray-300 cursor-pointer hover:opacity-90"
                  onClick={() => window.open(user.verificationImages!.insurancePhoto, '_blank')}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">No documents uploaded yet</p>
            <p className="text-xs text-gray-500 mt-1">
              User needs to upload verification documents from the mobile app
            </p>
          </div>
        )}
      </div>

      {/* Verification Details Card */}
      {user.verificationDetails && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Vehicle Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {user.verificationDetails.licenseNumber && (
              <div>
                <p className="text-sm font-semibold text-gray-800">License Number</p>
                <p className="text-gray-900 font-mono">{user.verificationDetails.licenseNumber}</p>
              </div>
            )}
            {user.verificationDetails.vehicleMake && (
              <div>
                <p className="text-sm font-semibold text-gray-800">Vehicle Make</p>
                <p className="text-gray-900">{user.verificationDetails.vehicleMake}</p>
              </div>
            )}
            {user.verificationDetails.vehicleModel && (
              <div>
                <p className="text-sm font-semibold text-gray-800">Vehicle Model</p>
                <p className="text-gray-900">{user.verificationDetails.vehicleModel}</p>
              </div>
            )}
            {user.verificationDetails.vehicleYear && (
              <div>
                <p className="text-sm font-semibold text-gray-800">Vehicle Year</p>
                <p className="text-gray-900">{user.verificationDetails.vehicleYear}</p>
              </div>
            )}
            {user.verificationDetails.vehiclePlate && (
              <div>
                <p className="text-sm font-semibold text-gray-800">License Plate</p>
                <p className="text-gray-900 font-mono">{user.verificationDetails.vehiclePlate}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Statistics Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">User Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{user.trustScore.toFixed(1)}</p>
            <p className="text-sm text-gray-600 mt-1">Trust Score</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{user.completedRides}</p>
            <p className="text-sm text-gray-600 mt-1">Completed Rides</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {user.averageRating > 0 ? user.averageRating.toFixed(1) : 'N/A'}
            </p>
            <p className="text-sm text-gray-600 mt-1">Avg Rating</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">{user.cancellations}</p>
            <p className="text-sm text-gray-600 mt-1">Cancellations</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex justify-between p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-700">Total Rides:</span>
            <span className="text-sm font-semibold text-gray-900">{user.totalRides}</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-700">Late Cancellations:</span>
            <span className="text-sm font-semibold text-gray-900">{user.lateCancellations}</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-700">No Shows:</span>
            <span className="text-sm font-semibold text-gray-900">{user.noShows}</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-700">Account Status:</span>
            <span className={`text-sm font-semibold ${user.isBanned ? 'text-red-600' : 'text-green-600'}`}>
              {user.isBanned ? 'Banned' : 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {user.riderVerificationStatus === 'pending' && (
        <div className="flex gap-4">
          <button
            onClick={() => setShowRejectModal(true)}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
          >
            Reject Verification
          </button>
          <button
            onClick={() => setShowApproveModal(true)}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
          >
            Approve Verification
          </button>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Approve Verification</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to approve this rider verification? The user will be able to offer rides.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Add any notes about this approval..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setNote('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Reject Verification</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this verification request. The user will be notified.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Explain why this verification is being rejected..."
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setNote('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
