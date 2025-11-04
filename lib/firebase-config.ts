import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if we're in a build environment without credentials
const hasFirebaseConfig = firebaseConfig.projectId && firebaseConfig.apiKey;

// Initialize Firebase only if it hasn't been initialized and we have config
let app: FirebaseApp | undefined;
let firestore: Firestore | undefined;
let realtimeDb: Database | undefined;

if (hasFirebaseConfig) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  firestore = getFirestore(app);
  realtimeDb = getDatabase(app);
}

// Export database instances
export { app, firestore, realtimeDb };
