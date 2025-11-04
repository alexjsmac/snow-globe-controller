import { firestore } from './firebase-config';
import { collection, addDoc } from 'firebase/firestore';

export interface ThemeSessionData {
  sessionId: string;
  startTime: number; // When user became active
  endTime: number; // When user's turn ended
  duration: number; // Duration in seconds (should be 60)
  queueJoinTime: number; // When user joined queue
  queueWaitTime: number; // Time spent waiting in queue (seconds)
  theme: {
    row1: string; // Color selection
    row2: string; // Pattern selection
    row3: string; // Effect selection
  };
}

/**
 * Save session summary to Firestore when a user's turn ends
 */
export async function saveThemeSession(sessionData: ThemeSessionData): Promise<void> {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  
  try {
    const sessionsCollection = collection(firestore, 'sessions');
    
    await addDoc(sessionsCollection, {
      sessionId: sessionData.sessionId,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      duration: sessionData.duration,
      queueJoinTime: sessionData.queueJoinTime,
      queueWaitTime: sessionData.queueWaitTime,
      theme: sessionData.theme,
      createdAt: sessionData.endTime // For sorting/querying
    });

    console.log(`Session ${sessionData.sessionId} saved to Firestore`);
  } catch (error) {
    console.error('Error saving session:', error);
    throw error;
  }
}
