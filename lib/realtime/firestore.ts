import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot,
  DocumentData,
  WhereFilterOp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';

// Type for user data from Firestore
export interface FirestoreUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  role: 'rider' | 'passenger' | 'both';
  isRiderVerified: boolean;
  riderVerificationStatus: 'pending' | 'approved' | 'rejected';
  riderVerificationNote?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

/**
 * Subscribe to rider verification queue (users with pending verification status)
 * Listens for real-time changes to users collection where riderVerificationStatus is 'pending'
 */
export function subscribeToRiderVerificationQueue(
  onUpdate: (users: FirestoreUser[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // Return no-op unsubscribe if not in browser
  if (typeof window === 'undefined') {
    console.warn('Firestore subscription attempted during SSR - subscribeToRiderVerificationQueue');
    return () => {};
  }

  try {
    const usersRef = collection(firestore, 'users');
    const q = query(
      usersRef,
      where('riderVerificationStatus', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const users: FirestoreUser[] = [];
        snapshot.forEach((doc) => {
          users.push({
            uid: doc.id,
            ...doc.data(),
          } as FirestoreUser);
        });
        onUpdate(users);
      },
      (error) => {
        console.error('Error in rider verification queue listener:', error);
        if (onError) {
          onError(error);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Failed to create subscription:', error);
    if (onError && error instanceof Error) {
      onError(error);
    }
    return () => {};
  }
}

/**
 * Subscribe to a specific user's data
 * Listens for real-time changes to a single user document
 */
export function subscribeToUser(
  uid: string,
  onUpdate: (user: FirestoreUser | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // Return no-op unsubscribe if not in browser
  if (typeof window === 'undefined') {
    console.warn('Firestore subscription attempted during SSR - subscribeToUser');
    return () => {};
  }

  try {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('uid', '==', uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        if (snapshot.empty) {
          onUpdate(null);
          return;
        }

        const doc = snapshot.docs[0];
        onUpdate({
          uid: doc.id,
          ...doc.data(),
        } as FirestoreUser);
      },
      (error) => {
        console.error(`Error in user listener for ${uid}:`, error);
        if (onError) {
          onError(error);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Failed to create subscription:', error);
    if (onError && error instanceof Error) {
      onError(error);
    }
    return () => {};
  }
}

/**
 * Subscribe to users with a specific verification status
 */
export function subscribeToUsersByVerificationStatus(
  status: 'pending' | 'approved' | 'rejected',
  onUpdate: (users: FirestoreUser[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // Return no-op unsubscribe if not in browser
  if (typeof window === 'undefined') {
    console.warn('Firestore subscription attempted during SSR - subscribeToUsersByVerificationStatus');
    return () => {};
  }

  try {
    const usersRef = collection(firestore, 'users');
    const q = query(
      usersRef,
      where('riderVerificationStatus', '==', status)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const users: FirestoreUser[] = [];
        snapshot.forEach((doc) => {
          users.push({
            uid: doc.id,
            ...doc.data(),
          } as FirestoreUser);
        });
        onUpdate(users);
      },
      (error) => {
        console.error(`Error in verification status listener for ${status}:`, error);
        if (onError) {
          onError(error);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Failed to create subscription:', error);
    if (onError && error instanceof Error) {
      onError(error);
    }
    return () => {};
  }
}

/**
 * Subscribe to users with a custom filter
 * Provides flexibility for various filtering needs
 */
export function subscribeToUsersWithFilter(
  field: string,
  operator: WhereFilterOp,
  value: any,
  onUpdate: (users: FirestoreUser[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // Return no-op unsubscribe if not in browser
  if (typeof window === 'undefined') {
    console.warn('Firestore subscription attempted during SSR - subscribeToUsersWithFilter');
    return () => {};
  }

  try {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where(field, operator, value));

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const users: FirestoreUser[] = [];
        snapshot.forEach((doc) => {
          users.push({
            uid: doc.id,
            ...doc.data(),
          } as FirestoreUser);
        });
        onUpdate(users);
      },
      (error) => {
        console.error(`Error in custom filter listener:`, error);
        if (onError) {
          onError(error);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Failed to create subscription:', error);
    if (onError && error instanceof Error) {
      onError(error);
    }
    return () => {};
  }
}

/**
 * Subscribe to app configuration changes
 * Listens for real-time changes to the app_config document
 */
export function subscribeToAppConfig(
  onUpdate: (config: any) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // Return no-op unsubscribe if not in browser
  if (typeof window === 'undefined') {
    console.warn('Firestore subscription attempted during SSR - subscribeToAppConfig');
    return () => {};
  }

  try {
    const configRef = collection(firestore, 'app_config');

    const unsubscribe = onSnapshot(
      configRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        if (snapshot.empty) {
          onUpdate(null);
          return;
        }

        // Assuming there's a single config document
        const doc = snapshot.docs[0];
        onUpdate({
          id: doc.id,
          ...doc.data(),
        });
      },
      (error) => {
        console.error('Error in app config listener:', error);
        if (onError) {
          onError(error);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Failed to create subscription:', error);
    if (onError && error instanceof Error) {
      onError(error);
    }
    return () => {};
  }
}

/**
 * Custom hook helper for managing Firestore listeners with automatic cleanup
 * Usage in React components:
 * 
 * useEffect(() => {
 *   const unsubscribe = subscribeToRiderVerificationQueue(handleUpdate);
 *   return () => unsubscribe();
 * }, []);
 */
