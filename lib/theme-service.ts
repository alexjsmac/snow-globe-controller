import { realtimeDb } from './firebase-config';
import { ref, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';

/**
 * Update theme selection in Realtime Database for both live UI updates and TouchDesigner
 * This is the main function to call when updating theme selections
 */
export async function updateThemeSelection(
  row1: string,
  row2: string,
  row3: string,
  sessionId: string
): Promise<void> {
  if (!realtimeDb) {
    console.error('Firebase Realtime Database is not initialized');
    return;
  }
  try {
    const themeRef = ref(realtimeDb, 'themeValues/current');
    await set(themeRef, {
      row1,
      row2,
      row3,
      sessionId,
      timestamp: rtdbServerTimestamp()
    });
  } catch (error) {
    console.error('Error updating theme selection:', error);
    throw error;
  }
}

/**
 * Reset theme selection to "none" placeholders while keeping a valid JSON object shape
 * Used when the queue is completely empty so TouchDesigner parsing stays stable
 */
export async function resetThemeSelection(): Promise<void> {
  if (!realtimeDb) {
    console.error('Firebase Realtime Database is not initialized');
    return;
  }
  try {
    const themeRef = ref(realtimeDb, 'themeValues/current');
    await set(themeRef, {
      row1: "none",
      row2: "none",
      row3: "none",
      sessionId: "none",
      timestamp: rtdbServerTimestamp()
    });
  } catch (error) {
    console.error('Error resetting theme selection:', error);
    throw error;
  }
}
