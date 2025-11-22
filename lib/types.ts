/**
 * Shared type definitions for Firebase data structures
 */

// Queue-related types
export interface QueueUser {
  sessionId: string;
  joinedAt: number;
  position?: number;
}

export interface ActiveUser {
  sessionId: string;
  startTime: number;
  endTime: number;
  remainingTime: number;
}

export interface QueueState {
  activeUser: ActiveUser | 'none' | null;
  waitingUsers: { [sessionId: string]: QueueUser };
  queueLength: number;
}

// Theme selection data types
export interface ThemeData {
  row1: string;
  row2: string;
  row3: string;
  sessionId: string;
  timestamp: number;
}

export interface ThemeSelectionPayload {
  row1: string;
  row2: string;
  row3: string;
  sessionId: string;
  timestamp: object; // Firebase serverTimestamp
  active?: boolean;
}

// Session data types (for admin dashboard)
export interface SessionSummary {
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number;
  queueJoinTime?: number;
  queueWaitTime?: number;
  theme?: {
    row1: string;
    row2: string;
    row3: string;
  };
  // Legacy fields for old slider sessions
  dataPoints?: number;
  statistics?: {
    average: number;
    min: number;
    max: number;
    standardDeviation: number;
  };
}

// Firebase Realtime Database structure types
export interface FirebaseQueueData {
  activeUser?: ActiveUser;
  waitingUsers?: { [sessionId: string]: QueueUser };
  queueLength?: number;
}

export interface FirebaseSessionData {
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number;
  dataPoints: number;
  stats: {
    min: number;
    max: number;
    average: number;
    stdDev: number;
  };
}

// Motion values structure for Realtime Database (/motionValues/current)
export interface MotionValuesCurrent {
  x: number;
  y: number;
  z: number;
  sessionId: string;
  timestamp: number;
}
