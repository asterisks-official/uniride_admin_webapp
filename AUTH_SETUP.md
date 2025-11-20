# Authentication Setup

## Overview

The UniRide Admin WebApp now has complete client-side Firebase authentication integrated.

## What Was Implemented

1. **Firebase Client SDK** (`lib/firebase/client.ts`)
   - Initialized with your Firebase config
   - Exports `auth` instance for authentication

2. **Auth Context** (`lib/contexts/AuthContext.tsx`)
   - Manages authentication state across the app
   - Provides `useAuth()` hook with:
     - `user` - Current authenticated user
     - `loading` - Loading state
     - `signIn(email, password)` - Sign in function
     - `signOut()` - Sign out function
     - `getIdToken()` - Get Firebase ID token

3. **API Client** (`lib/utils/apiClient.ts`)
   - `apiFetch()` - Wrapper around fetch that automatically includes Bearer token
   - All API calls now use this instead of regular `fetch()`

4. **Login Page** (`app/login/page.tsx`)
   - Email/password login form
   - Validates admin claim after sign-in
   - Redirects to dashboard on success

5. **Protected Routes** (`app/(admin)/layout.tsx`)
   - Wraps all admin pages
   - Redirects to login if not authenticated
   - Shows navigation bar with sign out button

## How to Use

### For Users

1. Navigate to `/login`
2. Enter your Firebase admin credentials
3. You'll be redirected to the dashboard
4. All API calls will automatically include your auth token

### For Developers

**Using the auth context:**
```tsx
import { useAuth } from '@/lib/contexts/AuthContext';

function MyComponent() {
  const { user, loading, signOut } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  
  return <div>Welcome {user.email}</div>;
}
```

**Making authenticated API calls:**
```tsx
import { apiFetch } from '@/lib/utils/apiClient';

// Instead of fetch()
const response = await apiFetch('/api/users');

// Works with all options
const response = await apiFetch('/api/users', {
  method: 'POST',
  body: JSON.stringify(data),
  headers: { 'Content-Type': 'application/json' }
});
```

## Admin User Setup

To create an admin user in Firebase:

1. Create a user in Firebase Authentication
2. Set the custom claim using Firebase Admin SDK or Firebase CLI:

```bash
firebase auth:set-custom-user-claims <uid> '{"admin": true}'
```

Or using the Admin SDK:
```javascript
admin.auth().setCustomUserClaims(uid, { admin: true });
```

## Security Notes

- Only users with the `admin: true` custom claim can access the admin portal
- Firebase ID tokens are automatically refreshed
- Tokens are stored in browser local storage for persistence
- All API routes verify the admin claim server-side

## Files Modified

- `app/layout.tsx` - Added AuthProvider
- `app/page.tsx` - Added redirect logic
- `app/(admin)/**/*.tsx` - Updated all fetch calls to use apiFetch
- All admin pages now automatically include auth token in requests
