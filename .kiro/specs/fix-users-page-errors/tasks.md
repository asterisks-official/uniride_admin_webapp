# Implementation Plan

- [x] 1. Add SSR safety checks to Firebase client initialization





  - Modify `lib/firebase/client.ts` to add `isBrowser()` helper function
  - Update the `firestore` proxy to check for browser environment before accessing Firestore instance
  - Add warning log when Firestore is accessed during SSR
  - _Requirements: 1.2, 1.3_

- [x] 2. Add client-side guards to Firestore subscription functions





  - Modify `subscribeToRiderVerificationQueue` in `lib/realtime/firestore.ts` to check for browser environment
  - Return no-op unsubscribe function when called during SSR
  - Add warning log when subscription is attempted during SSR
  - Apply same pattern to other subscription functions: `subscribeToUser`, `subscribeToUsersByVerificationStatus`, `subscribeToUsersWithFilter`, `subscribeToAppConfig`
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 3. Fix hydration mismatch in root layout





  - Add `suppressHydrationWarning` attribute to `<body>` element in `app/layout.tsx`
  - Verify no other dynamic attributes or values are rendered during SSR
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Verify Users Page subscription behavior








  - Review the `useEffect` hook in `app/(admin)/users/page.tsx` to ensure proper cleanup
  - Confirm subscription only runs on client side (already using useEffect correctly)
  - Test that pending verification count updates correctly
  - _Requirements: 1.1, 1.4, 3.1, 3.2, 3.3, 3.4_
