# Authentication System

## Overview

The UniRide Admin WebApp uses Firebase Authentication with session cookies for secure, server-side authentication. Only users with the `admin` custom claim can access the admin interface.

## Architecture

### Components

1. **Firebase Client SDK** (`lib/firebase/client.ts`)
   - Handles client-side authentication
   - Manages user sign-in/sign-out

2. **Firebase Admin SDK** (`lib/firebase/admin.ts`)
   - Server-side token verification
   - Session cookie creation and validation

3. **Auth Context** (`lib/contexts/AuthContext.tsx`)
   - React context for authentication state
   - Provides `signIn`, `signOut`, and `getIdToken` methods
   - Automatically verifies admin claim on auth state changes

4. **Middleware** (`middleware.ts`)
   - Protects all routes except `/login` and public assets
   - Verifies session cookie on every request
   - Redirects unauthenticated users to login page

5. **Auth API Routes**
   - `POST /api/auth/session` - Creates session cookie from ID token
   - `DELETE /api/auth/session` - Clears session cookie (logout)
   - `GET /api/auth/verify` - Verifies current session
   - `POST /api/auth/verify` - Verifies ID token or session cookie

## Authentication Flow

### Login Flow

1. User enters email and password on `/login` page
2. Firebase Client SDK authenticates the user
3. Client retrieves ID token and checks for `admin` claim
4. If admin claim exists, client sends ID token to `/api/auth/session`
5. Server creates a session cookie (expires in 5 days)
6. Session cookie is set as HTTP-only, secure cookie
7. User is redirected to dashboard or original requested page

### Protected Route Access

1. User requests a protected route (e.g., `/dashboard`)
2. Middleware intercepts the request
3. Middleware checks for presence of session cookie
4. If cookie exists, request proceeds to page/API route
5. If cookie is missing, user is redirected to `/login`
6. Page components and API routes verify the session cookie with Firebase Admin SDK
7. If verification fails, the component/route handles the error appropriately

**Note**: Middleware only checks for cookie presence due to Edge Runtime limitations. Full verification happens in API routes and server components using Firebase Admin SDK.

### Logout Flow

1. User clicks "Sign Out" in header menu
2. Client calls `signOut()` from Auth Context
3. Session cookie is cleared via `DELETE /api/auth/session`
4. Firebase client signs out the user
5. User is redirected to `/login` page

## Session Management

- **Session Duration**: 5 days
- **Cookie Settings**:
  - `httpOnly: true` - Prevents JavaScript access
  - `secure: true` (production) - HTTPS only
  - `sameSite: 'lax'` - CSRF protection
  - `path: '/'` - Available to all routes

## Admin Claim Setup

To grant admin access to a user, use the provided script:

```bash
npm run set-admin <user-email>
```

This sets the `admin: true` custom claim on the user's Firebase Auth account.

## Security Features

1. **Server-side verification** - All authentication checks happen on the server
2. **HTTP-only cookies** - Session tokens cannot be accessed by JavaScript
3. **Admin claim validation** - Every request verifies the admin claim
4. **Automatic token refresh** - Firebase handles token refresh automatically
5. **Secure credential storage** - Service account keys are server-only

## Environment Variables

### Client-side (Public)
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

### Server-side (Private)
```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

## Error Handling

- **401 Unauthorized** - Invalid or expired session
- **403 Forbidden** - User lacks admin privileges
- **Redirect to login** - Automatic redirect with original URL preserved

## Testing Authentication

1. Create a test user in Firebase Console
2. Set admin claim: `npm run set-admin test@example.com`
3. Login at `/login` with test credentials
4. Verify access to admin routes
5. Test logout functionality
