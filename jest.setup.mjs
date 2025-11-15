import '@testing-library/jest-dom';

// Mock Firebase app
const mockApp = { name: '[DEFAULT]', options: {} };
const mockDatabase = { app: mockApp, type: 'database' };
const mockFirestore = { app: mockApp, type: 'firestore' };

// Mock Firebase modules
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => mockApp),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => mockApp),
}));

jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(() => mockDatabase),
  ref: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn(),
  serverTimestamp: jest.fn(() => ({ '.sv': 'timestamp' })),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => mockFirestore),
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ '.sv': 'timestamp' })),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-domain';
process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL = 'https://test-db.firebaseio.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-bucket';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'test-sender';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'test-app-id';
