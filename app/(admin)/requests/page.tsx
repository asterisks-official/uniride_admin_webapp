'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/utils/apiClient';
import { subscribeToRideRequests, unsubscribe } from '@/lib/realtime/supabase';
import type { Database } from '@/lib/supabase/types';

type RequestRow = Database['public']['Tables']['ride_requests']['Row'];

interface RideRequest {
  id: string;
  rideId: string;
  passengerUid: string;
  seatsRequested: number;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResult {
  data: RideRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function RequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });

  // Filter state
  const [filters, setFilters] = useState({
    rideId: searchParams.get('rideId') || '',
    status: searchParams.get('status') || '',
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'accept' | 'decline' | null;
    requestId: string | null;
  }>({
    isOpen: false,
    action: null,
    requestId: null,
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [searchParams]);

  // Real-time subscription for request updates
  useEffect(() => {
    const channel = subscribeToRideRequests(
      // onInsert
      (newRequest: RequestRow) => {
        setRequests((prev) => {
          // Check if request matches current filters before adding
          const matchesFilters = 
            (!filters.rideId || newRequest.ride_id === filters.rideId) &&
            (!filters.status || newRequest.status === filters.status);
          
          if (matchesFilters) {
            // Add to beginning of list if not already present
            const exists = prev.some(r => r.id === newRequest.id);
            if (!exists) {
              return [transformRequest(newRequest), ...prev];
            }
          }
          return prev;
        });
        setIsLive(true);
        setTimeout(() => setIsLive(false), 2000);
      },
      // onUpdate
      (updatedRequest: RequestRow) => {
        setRequests((prev) => {
          const index = prev.findIndex(r => r.id === updatedRequest.id);
          if (index !== -1) {
            const newRequests = [...prev];
            newRequests[index] = transformRequest(updatedRequest);
            return newRequests;
          }
          return prev;
        });
        setIsLive(true);
        setTimeout(() => setIsLive(false), 2000);
      },
      // onDelete
      (deletedRequest: RequestRow) => {
        setRequests((prev) => prev.filter(r => r.id !== deletedRequest.id));
        setIsLive(true);
        setTimeout(() => setIsLive(false), 2000);
      }
    );

    return () => {
      unsubscribe(channel);
    };
  }, [filters.rideId, filters.status]);

  // Helper function to transform Supabase row to RideRequest interface
  const transformRequest = (row: RequestRow): RideRequest => ({
    id: row.id,
    rideId: row.ride_id,
    passengerUid: row.passenger_uid,
    seatsRequested: row.seats_requested,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.rideId) params.set('rideId', filters.rideId);
      if (filters.status) params.set('status', filters.status);
      params.set('page', searchParams.get('page') || '1');
      params.set('pageSize', searchParams.get('pageSize') || '50');

      const response = await apiFetch(`/api/requests?${params.toString()}`);
      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to fetch requests');
      }

      setRequests(result.data.data);
      setPagination({
        page: result.data.page,
        pageSize: result.data.pageSize,
        total: result.data.total,
        totalPages: result.data.totalPages,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    
    if (filters.rideId) params.set('rideId', filters.rideId);
    if (filters.status) params.set('status', filters.status);
    params.set('page', '1');

    router.push(`/requests?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/requests?${params.toString()}`);
  };

  const openConfirmDialog = (action: 'accept' | 'decline', requestId: string) => {
    setConfirmDialog({
      isOpen: true,
      action,
      requestId,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      action: null,
      requestId: null,
    });
  };

  const handleAction = async () => {
    if (!confirmDialog.requestId || !confirmDialog.action) return;

    setActionLoading(true);
    try {
      const endpoint = confirmDialog.action === 'accept' ? 'force-accept' : 'force-decline';
      const response = await apiFetch(`/api/requests/${confirmDialog.requestId}/${endpoint}`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || `Failed to ${confirmDialog.action} request`);
      }

      // Refresh the list
      await fetchRequests();
      closeConfirmDialog();
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
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Request Moderation</h1>
            <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-green-400'}`}></span>
              Live
            </span>
          </div>
          <p className="text-gray-600 mt-2">Review and manage ride requests</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ride ID
              </label>
              <input
                type="text"
                value={filters.rideId}
                onChange={(e) => handleFilterChange('rideId', e.target.value)}
                placeholder="Enter ride ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setFilters({
                  rideId: '',
                  status: '',
                });
                router.push('/requests');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading requests...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchRequests}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No requests found matching your filters.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Request ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ride ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Passenger
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seats
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {requests.map((request) => (
                      <tr 
                        key={request.id} 
                        className={`hover:bg-gray-50 ${
                          request.status === 'pending' ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {request.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          <button
                            onClick={() => router.push(`/rides/${request.rideId}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {request.rideId.substring(0, 8)}...
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={() => router.push(`/users/${request.passengerUid}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {request.passengerUid.substring(0, 8)}...
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.seatsRequested}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {request.message || <span className="text-gray-400">No message</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(request.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {request.status === 'pending' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openConfirmDialog('accept', request.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => openConfirmDialog('decline', request.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400">No actions</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {(pagination.page - 1) * pagination.pageSize + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Confirm {confirmDialog.action === 'accept' ? 'Accept' : 'Decline'} Request
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to {confirmDialog.action} this ride request? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeConfirmDialog}
                disabled={actionLoading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-md text-white disabled:opacity-50 ${
                  confirmDialog.action === 'accept'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoading ? 'Processing...' : `Yes, ${confirmDialog.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
