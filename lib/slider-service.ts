import { realtimeDb } from './firebase-config';
import { ref, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';

/**
 * Update slider value in Realtime Database for both live UI updates and TouchDesigner
 * This is the main function to call when updating slider values
 */
export async function updateSliderValue(value: number, sessionId: string): Promise<void> {
  if (!realtimeDb) {
    console.error('Firebase Realtime Database is not initialized');
    return;
  }
  try {
    const sliderRef = ref(realtimeDb, 'sliderValues/current');
    await set(sliderRef, {
      value,
      normalizedValue: (value + 1) / 2, // Convert -1 to 1 range to 0 to 1
      sessionId,
      timestamp: rtdbServerTimestamp()
    });
  } catch (error) {
    console.error('Error updating slider value:', error);
    throw error;
  }
}
