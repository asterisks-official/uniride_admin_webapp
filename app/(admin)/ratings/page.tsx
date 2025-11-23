'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/utils/apiClient';
import RatingPatterns from '@/components/RatingPatterns';

interface Rating {
  id: string;
  rideId: string;
  raterUid: string;
  ratedUid: string;
  raterRole: 'rider' | 'passenger';
  rating: number;
  review: string | null;
  tags: string[] | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function RatingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    rideId: searchParams.get('rideId') || '',
    userUid: searchParams.get('userUid') || '',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'hide' | 'delete' | null;
    ratingId: string | null;
  }>({ isOpen: false, action: null, ratingId: null });

  useEffect(() => {
    fetchRatings();
  }, [searchParams]);

  const fetchRatings = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.rideId) params.set('rideId', filters.rideId);
      if (filters.userUid) params.set('userUid', filters.userUid);
      params.set('page', searchParams.get('page') || '1');
      params.set('pageSize', searchParams.get('pageSize') || '50');

      const response = await apiFetch(`/api/ratings?${params.toString()}`);
      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to fetch ratings');
      }

      const r: PaginatedResult<Rating> = result.data;
      setRatings(r.data);
      setPagination({ page: r.page, pageSize: r.pageSize, total: r.total, totalPages: r.totalPages });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: 'rideId' | 'userUid', value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (filters.rideId) params.set('rideId', filters.rideId);
    if (filters.userUid) params.set('userUid', filters.userUid);
    params.set('page', '1');
    router.push(`/ratings?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({ rideId: '', userUid: '' });
    router.push('/ratings');
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/ratings?${params.toString()}`);
  };

  const openConfirmDialog = (action: 'hide' | 'delete', rating: Rating) => {
    setConfirmDialog({ isOpen: true, action, ratingId: `${rating.rideId}:${rating.raterUid}` });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, action: null, ratingId: null });
  };

  const handleAction = async () => {
    if (!confirmDialog.isOpen || !confirmDialog.action || !confirmDialog.ratingId) return;
    setActionLoading(true);
    try {
      if (confirmDialog.action === 'hide') {
        const response = await apiFetch(`/api/ratings/${confirmDialog.ratingId}/hide`, { method: 'POST' });
        const result = await response.json();
        if (!result.ok) {
          throw new Error(result.error?.message || 'Failed to hide rating');
        }
      } else if (confirmDialog.action === 'delete') {
        const response = await apiFetch(`/api/ratings/${confirmDialog.ratingId}`, { method: 'DELETE' });
        const result = await response.json();
        if (!result.ok) {
          throw new Error(result.error?.message || 'Failed to delete rating');
        }
      }
      await fetchRatings();
      closeConfirmDialog();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ratings</h1>
            <p className="text-gray-600 mt-2">View and moderate ride ratings</p>
          </div>
          <button
            onClick={async () => {
              try {
                const { triggerCSVExport } = await import('@/lib/utils/exportHelpers');
                await triggerCSVExport('/api/export/ratings.csv');
              } catch (error) {
                alert(error instanceof Error ? error.message : 'Export failed');
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Export to CSV
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ride ID</label>
                <input
                  type="text"
                  value={filters.rideId}
                  onChange={(e) => handleFilterChange('rideId', e.target.value)}
                  placeholder="Filter by ride..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User UID</label>
                <input
                  type="text"
                  value={filters.userUid}
                  onChange={(e) => handleFilterChange('userUid', e.target.value)}
                  placeholder="Filter by user..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Clear
              </button>
            </div>
          </div>

          <div>
            <RatingPatterns userUid={filters.userUid || undefined} rideId={filters.rideId || undefined} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Results</h2>
              <p className="text-sm text-gray-600">{pagination.total} total</p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : ratings.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No ratings found</div>
          ) : (
            <div className="divide-y">
              {ratings.map((r) => (
                <div key={`${r.rideId}:${r.raterUid}`} className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-gray-900">{r.rating} ⭐</span>
                        <span className={`px-2 py-1 text-xs rounded ${r.isVisible ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.isVisible ? 'Visible' : 'Hidden'}</span>
                      </div>
                      {r.tags && r.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {r.tags.map((t) => (
                            <span key={t} className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-md font-medium">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {r.review && (
                      <p className="text-gray-800">{r.review}</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-700">
                      <div>
                        <p className="font-semibold">Ride ID</p>
                        <p className="font-mono">{r.rideId}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Rater</p>
                        <p><span className="font-mono">{r.raterUid}</span> ({r.raterRole})</p>
                      </div>
                      <div>
                        <p className="font-semibold">Rated</p>
                        <p className="font-mono">{r.ratedUid}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Created</p>
                        <p>{formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {r.isVisible && (
                        <button
                          onClick={() => openConfirmDialog('hide', r)}
                          className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                        >
                          Hide
                        </button>
                      )}
                      <button
                        onClick={() => openConfirmDialog('delete', r)}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-6 border-t">
            <div className="flex items-center justify-between">
              <button
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-2 bg-gray-200 text-gray-800 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <div className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <button
                onClick={() => handlePageChange(Math.min(pagination.totalPages || 1, pagination.page + 1))}
                disabled={pagination.page >= pagination.totalPages || pagination.totalPages === 0}
                className="px-3 py-2 bg-gray-200 text-gray-800 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {confirmDialog.action === 'hide' ? 'Hide rating?' : 'Delete rating?'}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {confirmDialog.action === 'hide'
                  ? 'This will hide the rating from public view.'
                  : 'This will permanently delete the rating.'}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeConfirmDialog}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={actionLoading}
                  className={`px-4 py-2 text-white rounded ${confirmDialog.action === 'hide' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}
                >
                  {actionLoading ? 'Processing...' : confirmDialog.action === 'hide' ? 'Hide' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}