# Real-time Updates Setup Guide

This document explains how to set up and configure real-time updates for the UniRide Admin Web App.

## Overview

The admin app uses two real-time data sources:
1. **Supabase Realtime** - For PostgreSQL database changes (rides, requests, notifications)
2. **Firestore Listeners** - For Firebase user data changes (verification queue)

## Environment Variables

### Required Variables

Add these to your `.env.local` file:

#### Supabase (Client-side)
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### Firebase (Client-side)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Getting Firebase Client Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → Project Settings
4. Scroll down to "Your apps" section
5. If you don't have a web app, click "Add app" and select Web
6. Copy the configuration values to your `.env.local`

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to Project Settings → API
4. Copy the "Project URL" to `NEXT_PUBLIC_SUPABASE_URL`
5. Copy the "anon public" key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Features

### 1. Rides Dashboard Real-time Updates
- **Location**: `/rides`
- **Updates**: Live ride status changes, new rides, deleted rides
- **Indicator**: Green "Live" badge that pulses when updates occur
- **Filtering**: Only shows rides matching current filters

### 2. Requests Queue Real-time Updates
- **Location**: `/requests`
- **Updates**: New ride requests, status changes, deleted requests
- **Indicator**: Green "Live" badge that pulses when updates occur
- **Filtering**: Only shows requests matching current filters

### 3. Verification Queue Real-time Updates
- **Location**: `/users`
- **Updates**: Pending rider verification count
- **Indicator**: Yellow badge showing pending count
- **Auto-refresh**: Automatically refreshes list when viewing pending verifications

### 4. Notification Indicator
- **Location**: Navigation bar (all pages)
- **Updates**: Real-time notification count
- **Indicator**: Red badge with unread count, pulse animation for new notifications
- **Action**: Click to navigate to notifications page

## Implementation Details

### Supabase Realtime

The Supabase Realtime implementation uses PostgreSQL's replication features to stream changes:

```typescript
import { subscribeToRides, unsubscribe } from '@/lib/realtime/supabase';

// In your component
useEffect(() => {
  const channel = subscribeToRides(
    (newRide) => console.log('New ride:', newRide),
    (updatedRide) => console.log('Updated ride:', updatedRide),
    (deletedRide) => console.log('Deleted ride:', deletedRide)
  );

  return () => unsubscribe(channel);
}, []);
```

### Firestore Listeners

The Firestore implementation uses snapshot listeners:

```typescript
import { subscribeToRiderVerificationQueue } from '@/lib/realtime/firestore';

// In your component
useEffect(() => {
  const unsubscribe = subscribeToRiderVerificationQueue(
    (users) => console.log('Pending users:', users),
    (error) => console.error('Error:', error)
  );

  return () => unsubscribe();
}, []);
```

## Cleanup

All subscriptions automatically clean up when components unmount to prevent memory leaks. This is handled by returning the unsubscribe function from the `useEffect` hook.

## Troubleshooting

### "Missing required environment variables" error

Make sure all required environment variables are set in your `.env.local` file. The app will not start without them.

### Real-time updates not working

1. Check that Supabase Realtime is enabled for your tables:
   - Go to Supabase Dashboard → Database → Replication
   - Enable replication for: `rides`, `ride_requests`, `notifications`

2. Check Firestore security rules allow reading user data

3. Check browser console for connection errors

### High latency

Real-time updates may have slight delays depending on:
- Network conditions
- Database load
- Number of concurrent connections

Typical latency is 100-500ms for Supabase and 200-1000ms for Firestore.

## Security Considerations

- The Supabase anon key is safe to expose (it's public)
- The Firebase client config is safe to expose (it's public)
- Row Level Security (RLS) policies should be configured in Supabase
- Firestore security rules should be configured in Firebase

## Performance

- Subscriptions are lightweight and use WebSocket connections
- Each page manages its own subscriptions
- Subscriptions are automatically cleaned up on unmount
- Filter-aware updates prevent unnecessary re-renders
