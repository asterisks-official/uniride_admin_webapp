'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/utils/apiClient';

interface Ride {
  id: string;
  ownerUid: string;
  fromLocation: string;
  fromLat: number;
  fromLng: number;
  toLocation: string;
  toLat: number;
  toLng: number;
  departAt: string;
  seatsTotal: number;
  seatsAvailable: number;
  price: number;
  vehicleInfo: string | null;
  notes: string | null;
  status: string;
  visible: boolean;
  // New fields from unified schema
  rideType?: 'offer' | 'request';
  earnings?: number;
  platformFee?: number;
  totalAmount?: number;
  paymentStatus?: string;
  paymentMethod?: string | null;
  distanceKm?: number | null;
  durationMinutes?: number | null;
  // Existing fields
  matchedAt: string | null;
  riderUid: string | null;
  passengerUid: string | null;
  confirmationDeadline: string | null;
  riderConfirmedGoing: boolean;
  passengerConfirmedGoing: boolean;
  riderConfirmedCompletion: boolean;
  passengerConfirmedCompletion: boolean;
  cancelledAt: string | null;
  cancelledByUid: string | null;
  cancellationReason: string | null;
  cancellationFee: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  rideId: string;
  senderUid: string;
  message: string;
  createdAt: string;
}

interface Rating {
  id: string;
  rideId: string;
  raterUid: string;
  ratedUid: string;
  raterRole: string;
  rating: number;
  review: string | null;
  reviewTags: string[] | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RideTransaction {
  id: string;
  rideId: string;
  payerUid: string;
  payeeUid: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  transactionType: 'ride_payment' | 'cancellation_fee' | 'refund' | 'bonus';
  paymentMethod: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  processedAt: string | null;
  createdAt: string;
}

interface RideCancellation {
  id: string;
  rideId: string;
  cancelledByUid: string;
  cancelledByRole: 'rider' | 'passenger';
  cancellationStage: string;
  reasonCategory: string;
  reasonText: string | null;
  cancellationFeeApplied: boolean;
  feeAmount: number;
  hoursBeforeDeparture: number | null;
  cancelledAt: string;
}

export default function RideDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [ride, setRide] = useState<Ride | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [transactions, setTransactions] = useState<RideTransaction[]>([]);
  const [cancellation, setCancellation] = useState<RideCancellation | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
  // Form states
  const [cancelReason, setCancelReason] = useState('');
  const [applyFee, setApplyFee] = useState(false);
  const [feeAmount, setFeeAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Rating moderation states
  const [showHideRatingModal, setShowHideRatingModal] = useState(false);
  const [showDeleteRatingModal, setShowDeleteRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [ratingActionLoading, setRatingActionLoading] = useState(false);

  useEffect(() => {
    fetchRideDetails();
  }, [id]);

  const fetchUserName = async (uid: string): Promise<string> => {
    try {
      const response = await apiFetch(`/api/users/${uid}`);
      const result = await response.json();
      if (result.ok && result.data) {
        return result.data.displayName || result.data.email || 'Unknown User';
      }
      return 'Unknown User';
    } catch (err) {
      console.error(`Failed to fetch user ${uid}:`, err);
      return 'Unknown User';
    }
  };

  const fetchRideDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch ride details
      const rideResponse = await apiFetch(`/api/rides/${id}`);
      const rideResult = await rideResponse.json();

      if (!rideResult.ok) {
        throw new Error(rideResult.error?.message || 'Failed to fetch ride');
      }

      const rideData = rideResult.data.ride || rideResult.data;
      setRide(rideData);

      // Collect all unique user IDs
      const userIds = new Set<string>();
      userIds.add(rideData.ownerUid);
      if (rideData.riderUid) userIds.add(rideData.riderUid);
      if (rideData.passengerUid) userIds.add(rideData.passengerUid);
      if (rideData.cancelledByUid) userIds.add(rideData.cancelledByUid);

      // Fetch chat messages
      const chatResponse = await apiFetch(`/api/rides/${id}/chat`);
      const chatResult = await chatResponse.json();
      if (chatResult.ok) {
        const messages = chatResult.data;
        setChatMessages(messages);
        // Add sender UIDs to the set
        messages.forEach((msg: ChatMessage) => userIds.add(msg.senderUid));
      }

      // Fetch ratings
      const ratingsResponse = await apiFetch(`/api/rides/${id}/ratings`);
      const ratingsResult = await ratingsResponse.json();
      if (ratingsResult.ok) {
        const ratingsData = ratingsResult.data;
        setRatings(ratingsData);
        // Add rater and rated UIDs to the set
        ratingsData.forEach((rating: Rating) => {
          userIds.add(rating.raterUid);
          userIds.add(rating.ratedUid);
        });
      }

      // Fetch transactions
      try {
        const transactionsResponse = await apiFetch(`/api/rides/${id}/transactions`);
        const transactionsResult = await transactionsResponse.json();
        if (transactionsResult.ok) {
          const transactionsData = transactionsResult.data;
          setTransactions(transactionsData);
          // Add payer and payee UIDs to the set
          transactionsData.forEach((transaction: RideTransaction) => {
            userIds.add(transaction.payerUid);
            userIds.add(transaction.payeeUid);
          });
        }
      } catch (err) {
        // Graceful degradation if transactions endpoint doesn't exist
        console.warn('Failed to fetch transactions:', err);
      }

      // Fetch cancellation details
      if (rideData.status === 'cancelled' || rideData.status === 'cancelled_by_rider' || rideData.status === 'cancelled_by_passenger') {
        try {
          const cancellationResponse = await apiFetch(`/api/rides/${id}/cancellation`);
          const cancellationResult = await cancellationResponse.json();
          if (cancellationResult.ok) {
            setCancellation(cancellationResult.data);
          }
        } catch (err) {
          // Graceful degradation if cancellation endpoint doesn't exist
          console.warn('Failed to fetch cancellation details:', err);
        }
      }

      // Fetch all user names
      const names: Record<string, string> = {};
      await Promise.all(
        Array.from(userIds).map(async (uid) => {
          names[uid] = await fetchUserName(uid);
        })
      );
      setUserNames(names);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    setActionLoading(true);

    try {
      const response = await apiFetch(`/api/rides/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason,
          applyFee,
          feeAmount: applyFee && feeAmount ? parseFloat(feeAmount) : undefined,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to cancel ride');
      }

      alert(result.data.message);
      setShowCancelModal(false);
      setCancelReason('');
      setApplyFee(false);
      setFeeAmount('');
      fetchRideDetails();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceComplete = async () => {
    setActionLoading(true);

    try {
      const response = await apiFetch(`/api/rides/${id}/force-complete`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to force complete ride');
      }

      alert(result.data.message);
      setShowCompleteModal(false);
      fetchRideDetails();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHideRating = async () => {
    if (!selectedRating) return;

    setRatingActionLoading(true);

    try {
      // Use the new id field if available, otherwise fall back to composite key
      const ratingId = selectedRating.id || `${selectedRating.rideId}:${selectedRating.raterUid}`;
      const response = await apiFetch(`/api/ratings/${ratingId}/hide`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to hide rating');
      }

      alert(result.data.message);
      setShowHideRatingModal(false);
      setSelectedRating(null);
      fetchRideDetails();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRatingActionLoading(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!selectedRating) return;

    setRatingActionLoading(true);

    try {
      // Use the new id field if available, otherwise fall back to composite key
      const ratingId = selectedRating.id || `${selectedRating.rideId}:${selectedRating.raterUid}`;
      const response = await apiFetch(`/api/ratings/${ratingId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to delete rating');
      }

      alert(result.data.message);
      setShowDeleteRatingModal(false);
      setSelectedRating(null);
      fetchRideDetails();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRatingActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'matched':
        return 'bg-purple-100 text-purple-800';
      case 'confirmed':
        return 'bg-indigo-100 text-indigo-800';
      case 'ongoing':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'cancelled_by_rider':
      case 'cancelled_by_passenger':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const UserDisplay = ({ uid }: { uid: string }) => (
    <div>
      <p className="text-gray-900 font-medium">{userNames[uid] || 'Loading...'}</p>
      <p className="text-xs text-gray-600 font-mono">{uid}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading ride details...</p>
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Ride not found'}</p>
          <button
            onClick={() => router.push('/rides')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Rides
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
              onClick={() => router.push('/rides')}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
            >
              ← Back to Rides
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Ride Details</h1>
          </div>
          <div className="flex gap-2">
            {ride.status !== 'cancelled' && ride.status !== 'completed' && (
              <>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Cancel Ride
                </button>
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Force Complete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Ride Information Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Ride Information</h2>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(ride.status || 'unknown')}`}>
              {(ride.status || 'UNKNOWN').toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Route</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">From:</p>
                  <p className="text-gray-900 font-medium">{ride.fromLocation}</p>
                  <p className="text-xs text-gray-600">
                    ({ride.fromLat.toFixed(6)}, {ride.fromLng.toFixed(6)})
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">To:</p>
                  <p className="text-gray-900 font-medium">{ride.toLocation}</p>
                  <p className="text-xs text-gray-600">
                    ({ride.toLat.toFixed(6)}, {ride.toLng.toFixed(6)})
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-900">Departure:</span>
                  <span className="font-semibold text-gray-900">{formatDate(ride.departAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-900">Seats:</span>
                  <span className="font-semibold text-gray-900">{ride.seatsAvailable} / {ride.seatsTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-900">Price:</span>
                  <span className="font-semibold text-gray-900">${ride.price.toFixed(2)}</span>
                </div>
                {ride.rideType && (
                  <div className="flex justify-between">
                    <span className="text-gray-900">Type:</span>
                    <span className={`font-medium px-2 py-1 rounded text-xs ${
                      ride.rideType === 'offer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {ride.rideType.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-900">Visible:</span>
                  <span className="font-semibold text-gray-900">{ride.visible ? 'Yes' : 'No'}</span>
                </div>
                {ride.distanceKm && (
                  <div className="flex justify-between">
                    <span className="text-gray-900">Distance:</span>
                    <span className="font-semibold text-gray-900">{ride.distanceKm.toFixed(1)} km</span>
                  </div>
                )}
                {ride.durationMinutes && (
                  <div className="flex justify-between">
                    <span className="text-gray-900">Duration:</span>
                    <span className="font-semibold text-gray-900">{ride.durationMinutes} min</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {ride.vehicleInfo && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Vehicle Info</h3>
              <p className="text-gray-900">{ride.vehicleInfo}</p>
            </div>
          )}

          {ride.notes && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Notes</h3>
              <p className="text-gray-900">{ride.notes}</p>
            </div>
          )}
        </div>

        {/* Earnings and Payment Card */}
        {(ride.earnings !== undefined || ride.paymentStatus) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Earnings & Payment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Financial Details</h3>
                <div className="space-y-2">
                  {ride.earnings !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-900">Rider Earnings:</span>
                      <span className="font-semibold text-green-600">${ride.earnings.toFixed(2)}</span>
                    </div>
                  )}
                  {ride.platformFee !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-900">Platform Fee:</span>
                      <span className="font-semibold text-gray-900">${ride.platformFee.toFixed(2)}</span>
                    </div>
                  )}
                  {ride.totalAmount !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-900">Total Amount:</span>
                      <span className="font-bold text-gray-900">${ride.totalAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Payment Status</h3>
                <div className="space-y-2">
                  {ride.paymentStatus && (
                    <div className="flex justify-between">
                      <span className="text-gray-900">Status:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        ride.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        ride.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ride.paymentStatus.toUpperCase()}
                      </span>
                    </div>
                  )}
                  {ride.paymentMethod && (
                    <div className="flex justify-between">
                      <span className="text-gray-900">Method:</span>
                      <span className="font-semibold text-gray-900">{ride.paymentMethod}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Participants Card */}
        {ride.matchedAt && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Participants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Rider</h3>
                {ride.riderUid && <UserDisplay uid={ride.riderUid} />}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">Confirmed Going:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      ride.riderConfirmedGoing ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {ride.riderConfirmedGoing ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">Confirmed Completion:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      ride.riderConfirmedCompletion ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {ride.riderConfirmedCompletion ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Passenger</h3>
                {ride.passengerUid && <UserDisplay uid={ride.passengerUid} />}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">Confirmed Going:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      ride.passengerConfirmedGoing ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {ride.passengerConfirmedGoing ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">Confirmed Completion:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      ride.passengerConfirmedCompletion ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {ride.passengerConfirmedCompletion ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {ride.confirmationDeadline && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-semibold text-yellow-900">
                  Confirmation Deadline: {formatDate(ride.confirmationDeadline)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Transactions Section */}
        {transactions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Transactions</h2>
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-4 border border-gray-200 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {transaction.transactionType.replace(/_/g, ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-600 font-mono mt-1">
                        ID: {transaction.id.substring(0, 16)}...
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getTransactionStatusColor(transaction.status)}`}>
                      {transaction.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-800 mb-1">Payer</p>
                      <p className="text-sm font-medium text-gray-900">{userNames[transaction.payerUid] || 'Loading...'}</p>
                      <p className="text-xs text-gray-600 font-mono">{transaction.payerUid.substring(0, 16)}...</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800 mb-1">Payee</p>
                      <p className="text-sm font-medium text-gray-900">{userNames[transaction.payeeUid] || 'Loading...'}</p>
                      <p className="text-xs text-gray-600 font-mono">{transaction.payeeUid.substring(0, 16)}...</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Amount</p>
                      <p className="text-sm font-semibold text-gray-900">{transaction.currency} {transaction.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Platform Fee</p>
                      <p className="text-sm font-semibold text-gray-900">{transaction.currency} {transaction.platformFee.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Net Amount</p>
                      <p className="text-sm font-semibold text-green-600">{transaction.currency} {transaction.netAmount.toFixed(2)}</p>
                    </div>
                    {transaction.paymentMethod && (
                      <div>
                        <p className="text-xs font-semibold text-gray-800">Payment Method</p>
                        <p className="text-sm text-gray-900">{transaction.paymentMethod}</p>
                      </div>
                    )}
                  </div>
                  {transaction.processedAt && (
                    <p className="text-xs text-gray-600 mt-2">
                      Processed: {formatDate(transaction.processedAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancellation Info */}
        {(ride.status === 'cancelled' || ride.status === 'cancelled_by_rider' || ride.status === 'cancelled_by_passenger') && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cancellation Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-900">Cancelled At:</span>
                <span className="font-semibold text-gray-900">{ride.cancelledAt ? formatDate(ride.cancelledAt) : 'N/A'}</span>
              </div>
              {ride.cancelledByUid && (
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Cancelled By:</p>
                  <UserDisplay uid={ride.cancelledByUid} />
                </div>
              )}
              {cancellation && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-900">Cancelled By Role:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      cancellation.cancelledByRole === 'rider' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {cancellation.cancelledByRole.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-900">Cancellation Stage:</span>
                    <span className="font-semibold text-gray-900">{cancellation.cancellationStage.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-900">Reason Category:</span>
                    <span className="font-semibold text-gray-900">{cancellation.reasonCategory.replace(/_/g, ' ')}</span>
                  </div>
                  {cancellation.hoursBeforeDeparture !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-900">Hours Before Departure:</span>
                      <span className="font-semibold text-gray-900">{cancellation.hoursBeforeDeparture.toFixed(1)} hours</span>
                    </div>
                  )}
                  {cancellation.cancellationFeeApplied && (
                    <div className="flex justify-between">
                      <span className="text-gray-900">Cancellation Fee:</span>
                      <span className="font-semibold text-red-600">${cancellation.feeAmount.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              {!cancellation && ride.cancellationFee && (
                <div className="flex justify-between">
                  <span className="text-gray-900">Cancellation Fee:</span>
                  <span className="font-semibold text-gray-900">${ride.cancellationFee.toFixed(2)}</span>
                </div>
              )}
            </div>
            {ride.cancellationReason && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm font-medium text-red-800">Reason:</p>
                <p className="text-sm text-red-700">{ride.cancellationReason}</p>
              </div>
            )}
          </div>
        )}

        {/* Completion Info */}
        {ride.status === 'completed' && ride.completedAt && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Completion Information</h2>
            <div className="flex justify-between">
              <span className="text-gray-700">Completed At:</span>
              <span className="font-medium">{formatDate(ride.completedAt)}</span>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Chat Messages</h2>
          {chatMessages.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No chat messages</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{userNames[msg.senderUid] || 'Loading...'}</p>
                      <p className="text-xs text-gray-600 font-mono">{msg.senderUid}</p>
                    </div>
                    <span className="text-xs text-gray-600">{formatDate(msg.createdAt)}</span>
                  </div>
                  <p className="text-gray-900">{msg.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ratings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ratings & Reviews</h2>
          {ratings.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No ratings yet</p>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        {rating.raterRole === 'rider' ? 'Rider' : 'Passenger'} rated{' '}
                        {rating.raterRole === 'rider' ? 'Passenger' : 'Rider'}
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-gray-600 mb-1">Rater:</p>
                          <p className="font-medium text-gray-900">{userNames[rating.raterUid] || 'Loading...'}</p>
                          <p className="text-gray-600 font-mono">{rating.raterUid.substring(0, 16)}...</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Rated:</p>
                          <p className="font-medium text-gray-900">{userNames[rating.ratedUid] || 'Loading...'}</p>
                          <p className="text-gray-600 font-mono">{rating.ratedUid.substring(0, 16)}...</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-yellow-500">
                        {rating.rating} ⭐
                      </span>
                      {!rating.isVisible && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
                          Hidden
                        </span>
                      )}
                    </div>
                  </div>
                  {rating.review && (
                    <p className="text-gray-900 mt-2">{rating.review}</p>
                  )}
                  {rating.reviewTags && rating.reviewTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {rating.reviewTags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-gray-600">Created: {formatDate(rating.createdAt)}</p>
                      {rating.updatedAt && rating.updatedAt !== rating.createdAt && (
                        <p className="text-xs text-gray-600">Updated: {formatDate(rating.updatedAt)}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {rating.isVisible && (
                        <button
                          onClick={() => {
                            setSelectedRating(rating);
                            setShowHideRatingModal(true);
                          }}
                          className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                        >
                          Hide
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedRating(rating);
                          setShowDeleteRatingModal(true);
                        }}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Metadata</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Ride ID</p>
              <p className="font-mono text-sm text-gray-900">{ride.id}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Ride Owner</p>
              <UserDisplay uid={ride.ownerUid} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Created At</p>
              <p className="text-sm text-gray-900">{formatDate(ride.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Updated At</p>
              <p className="text-sm text-gray-900">{formatDate(ride.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Ride Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Cancel Ride</h3>
            <p className="text-gray-600 mb-4">
              This will cancel the ride and notify all participants.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Explain why this ride is being cancelled..."
              />
            </div>
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={applyFee}
                  onChange={(e) => setApplyFee(e.target.checked)}
                  className="mr-2"
                />
                Apply cancellation fee
              </label>
              {applyFee && (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  placeholder="Fee amount"
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                  setApplyFee(false);
                  setFeeAmount('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCancelRide}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Cancel Ride'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Force Complete Ride</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to force complete this ride? This will mark the ride as
              completed regardless of participant confirmations.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCompleteModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleForceComplete}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Force Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hide Rating Modal */}
      {showHideRatingModal && selectedRating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Hide Rating</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to hide this rating? The rating will remain in the database
              but will not be visible to users.
            </p>
            <div className="p-3 bg-gray-50 rounded mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">
                Rating: {selectedRating.rating} ⭐
              </p>
              {selectedRating.review && (
                <p className="text-sm text-gray-600">{selectedRating.review}</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowHideRatingModal(false);
                  setSelectedRating(null);
                }}
                disabled={ratingActionLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleHideRating}
                disabled={ratingActionLoading}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                {ratingActionLoading ? 'Processing...' : 'Hide Rating'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Rating Modal */}
      {showDeleteRatingModal && selectedRating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Rating</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to permanently delete this rating? This action cannot be undone.
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded mb-4">
              <p className="text-sm font-medium text-red-800 mb-1">
                Rating: {selectedRating.rating} ⭐
              </p>
              {selectedRating.review && (
                <p className="text-sm text-red-700">{selectedRating.review}</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDeleteRatingModal(false);
                  setSelectedRating(null);
                }}
                disabled={ratingActionLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRating}
                disabled={ratingActionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {ratingActionLoading ? 'Processing...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
