import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseFirestore: Firestore | null = null;

// Check if running in browser environment
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Validate required environment variables
function validateEnv(): void {
  const required = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error('Environment variables check:', {
      allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_FIREBASE')),
      required,
      missing
    });
    throw new Error(
      `Missing required Firebase client environment variables: ${missing.join(', ')}\n` +
      `Please ensure these are set in your .env.local file and restart the dev server.`
    );
  }
}

// Initialize Firebase client SDK with singleton pattern (lazy)
function initializeFirebaseClient(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  validateEnv();

  // Check if app is already initialized
  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
    return firebaseApp;
  }

  // Initialize with client configuration
  firebaseApp = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  });

  return firebaseApp;
}

// Lazy getters for Auth and Firestore instances
export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    const app = initializeFirebaseClient();
    firebaseAuth = getAuth(app);
  }
  return firebaseAuth;
}

export function getFirebaseFirestore(): Firestore {
  if (!firebaseFirestore) {
    const app = initializeFirebaseClient();
    firebaseFirestore = getFirestore(app);
  }
  return firebaseFirestore;
}

// Export lazy-initialized instances for backward compatibility
export const auth = new Proxy({} as Auth, {
  get(target, prop) {
    if (!isBrowser()) {
      throw new Error('Firebase Auth cannot be accessed during SSR');
    }
    return getFirebaseAuth()[prop as keyof Auth];
  }
});

export const firestore = new Proxy({} as Firestore, {
  get(target, prop) {
    if (!isBrowser()) {
      throw new Error('Firebase Firestore cannot be accessed during SSR');
    }
    return getFirebaseFirestore()[prop as keyof Firestore];
  }
});
