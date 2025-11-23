'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/utils/apiClient';

interface Notification {
  id: string;
  userUid: string;
  type: string;
  title: string;
  message: string;
  actionData: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function NotificationsPage() {
  // Broadcast form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [segment, setSegment] = useState('');
  const [userUids, setUserUids] = useState('');
  const [actionData, setActionData] = useState('');
  const [launchUrl, setLaunchUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [type, setType] = useState('admin_broadcast');
  const [summary, setSummary] = useState<{ targetCount: number; playerIdCount: number; method: string } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [cred, setCred] = useState<{ authorized: boolean; appIdOk: boolean; appName?: string | null; keyFormat?: string } | null>(null);
  const [credLoading, setCredLoading] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Recent broadcasts state
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // User-specific viewer state
  const [viewerUserUid, setViewerUserUid] = useState('');
  const [userNotifications, setUserNotifications] = useState<Notification[]>([]);
  const [viewerLoading, setViewerLoading] = useState(false);

  useEffect(() => {
    fetchRecentBroadcasts();
  }, []);

  const fetchRecentBroadcasts = async () => {
    setNotificationsLoading(true);
    try {
      const response = await apiFetch('/api/notifications');
      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to fetch notifications');
      }

      // Show most recent 20 of all types
      const broadcasts = result.data.slice(0, 20);
      
      setRecentNotifications(broadcasts);
    } catch (err) {
      console.error('Failed to fetch recent broadcasts:', err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchUserNotifications = async () => {
    if (!viewerUserUid.trim()) {
      alert('Please enter a user UID');
      return;
    }

    setViewerLoading(true);
    try {
      const response = await apiFetch(`/api/notifications?userUid=${encodeURIComponent(viewerUserUid)}`);
      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to fetch user notifications');
      }

      setUserNotifications(result.data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to fetch user notifications');
    } finally {
      setViewerLoading(false);
    }
  };

  const fetchEligibility = async () => {
    setSummaryLoading(true);
    setSummary(null);
    try {
      const params = new URLSearchParams();
      if (segment.trim()) params.set('segment', segment.trim());
      const uidList = userUids
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .join(',');
      if (uidList) params.set('userUids', uidList);

      const resp = await fetch(`/api/notifications/eligibility?${params.toString()}`);
      const json = await resp.json();
      if (json.ok) {
        setSummary(json.data);
      } else {
        setSummary(null);
      }
    } catch (e) {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const checkCredentials = async () => {
    setCredLoading(true);
    setCred(null);
    try {
      const resp = await fetch('/api/notifications/onesignal/credentials');
      const json = await resp.json();
      if (json.ok) {
        setCred(json.data);
      } else if (json.data) {
        setCred(json.data);
      } else {
        setCred({ authorized: false, appIdOk: false });
      }
    } catch (_) {
      setCred({ authorized: false, appIdOk: false });
    } finally {
      setCredLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      alert('Please enter both title and message');
      return;
    }

    // If neither segment nor specific UIDs are provided, we will broadcast to all users

    setBroadcastLoading(true);
    try {
      const payload: any = {
        title: title.trim(),
        message: message.trim(),
      };

      if (segment) {
        payload.segment = segment;
      }

      if (userUids.trim()) {
        // Parse comma-separated UIDs
        payload.userUids = userUids
          .split(',')
          .map(uid => uid.trim())
          .filter(uid => uid.length > 0);
      }

      if (actionData.trim()) {
        try {
          payload.actionData = JSON.parse(actionData);
        } catch (e) {
          alert('Invalid JSON in action data');
          setBroadcastLoading(false);
          return;
        }
      }

      if (launchUrl.trim()) {
        payload.launchUrl = launchUrl.trim();
      }
      if (imageUrl.trim()) {
        payload.imageUrl = imageUrl.trim();
      }

      const response = await apiFetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, type }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to broadcast notification');
      }

      const info = result.data || {};
      const targetCountMsg = typeof info.targetCount === 'number' ? `Targets: ${info.targetCount}` : '';
      const pushCountMsg = typeof info.pushTargetCount === 'number' ? (info.pushTargetCount >= 0 ? `, Push recipients: ${info.pushTargetCount}` : ', Push recipients: All (via OneSignal segments)') : '';
      const pushErrorMsg = info.pushErrorMessage ? `\nPush error: ${info.pushErrorMessage}` : '';
      alert(`Notification broadcast successfully! ${targetCountMsg}${pushCountMsg}${pushErrorMsg}`);
      
      // Reset form
      setTitle('');
      setMessage('');
      setSegment('');
      setUserUids('');
      setActionData('');
      setLaunchUrl('');
      setImageUrl('');
      setType('admin_broadcast');
      setShowPreview(false);

      // Refresh recent broadcasts
      fetchRecentBroadcasts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to broadcast notification');
    } finally {
      setBroadcastLoading(false);
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

  const getSegmentLabel = (segmentValue: string) => {
    const labels: Record<string, string> = {
      high_trust: 'High Trust Users (80+)',
      low_trust: 'Low Trust Users (<50)',
      active_users: 'Active Users (5+ rides)',
      new_users: 'New Users (<3 rides)',
    };
    return labels[segmentValue] || segmentValue;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notification Console</h1>
          <p className="text-gray-600 mt-2">Broadcast notifications to platform users</p>
        </div>

        {/* Broadcast Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Broadcast Notification</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Enter notification title (max 100 characters)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
            </div>

            <div className="mt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={fetchEligibility}
                className="px-3 py-2 bg-gray-100 text-gray-800 rounded-md border border-gray-300 hover:bg-gray-200"
              >
                Check Audience
              </button>
              {summaryLoading && <span className="text-sm text-gray-600">Computing…</span>}
              {summary && (
                <span className="text-sm text-gray-700">
                  Method: {summary.method === 'segments' ? 'Segments (Subscribed Users)' : summary.method === 'player_ids' ? 'Player IDs' : 'External User IDs'}
                  {' '}· Targets: {summary.targetCount} · Push-eligible devices: {summary.playerIdCount}
                </span>
              )}
              <span className="mx-2 text-gray-300">|</span>
              <button
                type="button"
                onClick={checkCredentials}
                className="px-3 py-2 bg-gray-100 text-gray-800 rounded-md border border-gray-300 hover:bg-gray-200"
              >
                Check Credentials
              </button>
              {credLoading && <span className="text-sm text-gray-600">Checking…</span>}
              {cred && (
                <span className={`text-sm ${cred.authorized && cred.appIdOk ? 'text-green-700' : 'text-red-700'}`}>
                  OneSignal: {cred.authorized && cred.appIdOk ? 'Valid' : 'Invalid'}{cred.appName ? ` (${cred.appName})` : ''}
                  {cred.keyFormat ? ` · Key type: ${cred.keyFormat === 'app_key' ? 'App Key (wrong)' : cred.keyFormat === 'rest_key' ? 'REST Key' : 'Unknown'}` : ''}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Enter notification message (max 500 characters)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">{message.length}/500 characters</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Segment
                </label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Users</option>
                  <option value="high_trust">High Trust Users (80+)</option>
                  <option value="low_trust">Low Trust Users (&lt;50)</option>
                  <option value="active_users">Active Users (5+ rides)</option>
                  <option value="new_users">New Users (&lt;3 rides)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin_broadcast">Admin Broadcast</option>
                  <option value="ride_matched">Ride Matched</option>
                  <option value="ride_confirmed">Ride Confirmed</option>
                  <option value="ride_cancelled">Ride Cancelled</option>
                  <option value="ride_completed">Ride Completed</option>
                  <option value="ride_started">Ride Started</option>
                  <option value="payment_completed">Payment Completed</option>
                  <option value="request_accepted">Request Accepted</option>
                  <option value="request_declined">Request Declined</option>
                  <option value="rating_received">Rating Received</option>
                  <option value="report_resolved">Report Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specific User UIDs (comma-separated)
                </label>
                <input
                  type="text"
                  value={userUids}
                  onChange={(e) => setUserUids(e.target.value)}
                  placeholder="uid1, uid2, uid3..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to send to all users or choose a segment
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Launch URL (optional)
                </label>
                <input
                  type="url"
                  value={launchUrl}
                  onChange={(e) => setLaunchUrl(e.target.value)}
                  placeholder="https://example.com/path"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Opens when user taps the notification</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL (optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Shown as large image (Android/iOS/Web)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Data (JSON, optional)
              </label>
              <textarea
                value={actionData}
                onChange={(e) => setActionData(e.target.value)}
                rows={3}
                placeholder='{"rideId": "123", "action": "view_ride"}'
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional JSON data for deep linking or custom actions
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                disabled={!title.trim() || !message.trim()}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              <button
                onClick={handleBroadcast}
                disabled={broadcastLoading || !title.trim() || !message.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {broadcastLoading ? 'Broadcasting...' : 'Broadcast Notification'}
              </button>
            </div>
          </div>

          {/* Preview */}
          {showPreview && title && message && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Preview</h3>
              <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    <p className="text-sm text-gray-600 mt-1">{message}</p>
                    <p className="text-xs text-gray-400 mt-2">Just now</p>
                    {launchUrl && (
                      <p className="text-xs text-blue-600 mt-2">Launch: {launchUrl}</p>
                    )}
                    {imageUrl && (
                      <p className="text-xs text-gray-600 mt-1">Image: {imageUrl}</p>
                    )}
                  </div>
                </div>
              </div>
                <div className="mt-2 text-xs text-gray-600">
                  <p>Target: {segment ? getSegmentLabel(segment) : userUids ? 'Specific Users' : 'All Users'}</p>
                  {actionData && <p className="mt-1">Action Data: {actionData}</p>}
                  {summary && (
                    <p className="mt-1">Audience: {summary.method} · Targets: {summary.targetCount} · Eligible: {summary.playerIdCount}</p>
                  )}
                </div>
              </div>
          )}
        </div>

        {/* Recent Broadcasts */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Broadcasts</h2>
            <button
              onClick={fetchRecentBroadcasts}
              disabled={notificationsLoading}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {notificationsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading broadcasts...</p>
            </div>
          ) : recentNotifications.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No recent broadcasts found</p>
          ) : (
            <div className="space-y-3">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{notification.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${notification.type === 'admin_broadcast' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                          {notification.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>User: {notification.userUid.substring(0, 8)}...</span>
                        <span>{formatDate(notification.createdAt)}</span>
                        <span className={`px-2 py-1 rounded-full ${notification.isRead ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-600'}`}>
                          {notification.isRead ? 'Read' : 'Unread'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User-Specific Notifications Viewer */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">User Notifications Viewer</h2>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={viewerUserUid}
              onChange={(e) => setViewerUserUid(e.target.value)}
              placeholder="Enter user UID to view their notifications"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fetchUserNotifications}
              disabled={viewerLoading || !viewerUserUid.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {viewerLoading ? 'Loading...' : 'View Notifications'}
            </button>
          </div>

          {userNotifications.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-2">
                Showing {userNotifications.length} notification(s) for user {viewerUserUid}
              </p>
              {userNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border border-gray-200 rounded-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{notification.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${notification.type === 'admin_broadcast' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                          {notification.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{formatDate(notification.createdAt)}</span>
                        <span className={`px-2 py-1 rounded-full ${notification.isRead ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-600'}`}>
                          {notification.isRead ? 'Read' : 'Unread'}
                        </span>
                      </div>
                      {notification.actionData && (
                        <div className="mt-2 text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                          {JSON.stringify(notification.actionData)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
