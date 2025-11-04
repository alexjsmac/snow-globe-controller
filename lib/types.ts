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
  activeUser: ActiveUser | null;
  waitingUsers: { [sessionId: string]: QueueUser };
  queueLength: number;
}

// Slider data types (legacy)
export interface SliderData {
  value: number;
  normalizedValue: number;
  sessionId: string;
  timestamp: number;
}

export interface SliderValuePayload {
  value: number;
  normalizedValue: number;
  sessionId: string;
  timestamp: object; // Firebase serverTimestamp
  active?: boolean;
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

// Session data types
export interface SessionValueHistory {
  timestamp: Date;
  value: number;
}

export interface SessionStatistics {
  average: number;
  min: number;
  max: number;
  standardDeviation: number;
}

export interface SessionSummary {
  sessionId: string;
  startTime: number; // Timestamp in milliseconds
  endTime: number;   // Timestamp in milliseconds
  duration: number;  // Duration in seconds
  dataPoints: number;
  statistics: SessionStatistics;
}

// Firebase Realtime Database structure types
export interface FirebaseQueueData {
  activeUser?: ActiveUser;
  waitingUsers?: { [sessionId: string]: QueueUser };
  queueLength?: number;
}

export interface FirebaseSliderData {
  current?: SliderData;
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
