'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeToAllNotifications, unsubscribe } from '@/lib/realtime/supabase';
import type { Database } from '@/lib/supabase/types';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export default function NotificationIndicator() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // Fetch initial unread count
    fetchUnreadCount();

    // Subscribe to new notifications
    const channel = subscribeToAllNotifications((notification: NotificationRow) => {
      if (!notification.is_read) {
        setUnreadCount((prev) => prev + 1);
        setIsLive(true);
        setTimeout(() => setIsLive(false), 2000);
      }
    });

    return () => {
      unsubscribe(channel);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      // This would need an API endpoint to get unread count
      // For now, we'll just show the indicator when new notifications arrive
      // In a full implementation, you'd call: const response = await apiFetch('/api/notifications/unread-count');
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleClick = () => {
    router.push('/notifications');
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
      aria-label="Notifications"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unreadCount > 0 && (
        <span
          className={`absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 rounded-full ${
            isLive ? 'bg-red-600 animate-pulse' : 'bg-red-500'
          }`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      {isLive && unreadCount === 0 && (
        <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-pulse transform translate-x-1/2 -translate-y-1/2"></span>
      )}
    </button>
  );
}
