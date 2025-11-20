import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;

// Validate required environment variables
function validateEnv(): void {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Firebase Admin environment variables: ${missing.join(', ')}`
    );
  }
}

// Initialize Firebase Admin SDK with singleton pattern
function initializeFirebaseAdmin(): App {
  if (adminApp) {
    return adminApp;
  }

  validateEnv();

  // Check if app is already initialized
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  // Initialize with service account credentials
  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // Handle newline replacement for private key
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });

  return adminApp;
}

// Lazy getters for Auth and Firestore instances
export function getAuthAdmin(): Auth {
  if (!adminAuth) {
    const app = initializeFirebaseAdmin();
    adminAuth = getAuth(app);
  }
  return adminAuth;
}

export function getFirestoreAdmin(): Firestore {
  if (!adminFirestore) {
    const app = initializeFirebaseAdmin();
    adminFirestore = getFirestore(app);
  }
  return adminFirestore;
}

// Export lazy-initialized instances for backward compatibility
export const authAdmin = new Proxy({} as Auth, {
  get(target, prop) {
    return getAuthAdmin()[prop as keyof Auth];
  }
});

export const firestoreAdmin = new Proxy({} as Firestore, {
  get(target, prop) {
    return getFirestoreAdmin()[prop as keyof Firestore];
  }
});
