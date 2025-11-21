import { realtimeDb } from './firebase-config';
import { ref, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';

export interface MotionSamplePayload {
  x: number;
  y: number;
  z: number;
  sessionId: string;
}

/**
 * Update the latest motion sample for the active user.
 * TouchDesigner reads from /motionValues/current.
 */
export async function updateMotionSample(sample: MotionSamplePayload): Promise<void> {
  if (!realtimeDb) {
    console.error('Firebase Realtime Database is not initialized');
    return;
  }

  try {
    const motionRef = ref(realtimeDb, 'motionValues/current');
    await set(motionRef, {
      x: sample.x,
      y: sample.y,
      z: sample.z,
      sessionId: sample.sessionId,
      timestamp: rtdbServerTimestamp(),
    });
  } catch (error) {
    console.error('Error updating motion sample:', error);
    throw error;
  }
}

/**
 * Reset motion sample to a neutral state when no user is active.
 */
export async function resetMotionSample(): Promise<void> {
  if (!realtimeDb) {
    console.error('Firebase Realtime Database is not initialized');
    return;
  }

  try {
    const motionRef = ref(realtimeDb, 'motionValues/current');
    await set(motionRef, {
      x: 0,
      y: 0,
      z: 0,
      sessionId: 'none',
      timestamp: rtdbServerTimestamp(),
    });
  } catch (error) {
    console.error('Error resetting motion sample:', error);
    throw error;
  }
}
