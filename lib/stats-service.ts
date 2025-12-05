import { firestore } from './firebase-config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface GlobalStats {
  maxQueueLength: number;
  maxWaitTime: number;
  lastUpdated: number;
}

const STATS_DOC_PATH = 'stats/global';

/**
 * Get current global statistics from Firestore
 */
export async function getGlobalStats(): Promise<GlobalStats> {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return {
      maxQueueLength: 0,
      maxWaitTime: 0,
      lastUpdated: Date.now(),
    };
  }

  try {
    const statsRef = doc(firestore, STATS_DOC_PATH);
    const statsSnap = await getDoc(statsRef);

    if (statsSnap.exists()) {
      const data = statsSnap.data();
      return {
        maxQueueLength: data.maxQueueLength || 0,
        maxWaitTime: data.maxWaitTime || 0,
        lastUpdated: data.lastUpdated || Date.now(),
      };
    }

    // Initialize stats if they don't exist
    const initialStats: GlobalStats = {
      maxQueueLength: 0,
      maxWaitTime: 0,
      lastUpdated: Date.now(),
    };
    await setDoc(statsRef, initialStats);
    return initialStats;
  } catch (error) {
    console.error('Error getting global stats:', error);
    return {
      maxQueueLength: 0,
      maxWaitTime: 0,
      lastUpdated: Date.now(),
    };
  }
}

/**
 * Update max queue length if current length is greater
 */
export async function updateMaxQueueLength(currentLength: number): Promise<void> {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }

  try {
    const stats = await getGlobalStats();

    // eslint-disable-next-line no-console
    console.log(`Queue length check: current=${currentLength}, max=${stats.maxQueueLength}`);

    if (currentLength > stats.maxQueueLength) {
      const statsRef = doc(firestore, STATS_DOC_PATH);
      await updateDoc(statsRef, {
        maxQueueLength: currentLength,
        lastUpdated: Date.now(),
      });
      // eslint-disable-next-line no-console
      console.log(`✅ Updated max queue length: ${stats.maxQueueLength} → ${currentLength}`);
    }
  } catch (error) {
    console.error('Error updating max queue length:', error);
  }
}

/**
 * Update max wait time if current wait time is greater
 */
export async function updateMaxWaitTime(waitTimeSeconds: number): Promise<void> {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }

  try {
    const stats = await getGlobalStats();

    // eslint-disable-next-line no-console
    console.log(`Wait time check: current=${waitTimeSeconds}s, max=${stats.maxWaitTime}s`);

    if (waitTimeSeconds > stats.maxWaitTime) {
      const statsRef = doc(firestore, STATS_DOC_PATH);
      await updateDoc(statsRef, {
        maxWaitTime: waitTimeSeconds,
        lastUpdated: Date.now(),
      });
      // eslint-disable-next-line no-console
      console.log(`✅ Updated max wait time: ${stats.maxWaitTime}s → ${waitTimeSeconds}s`);
    }
  } catch (error) {
    console.error('Error updating max wait time:', error);
  }
}

/**
 * Reset all global statistics (called during database reset)
 */
export async function resetGlobalStats(): Promise<void> {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }

  try {
    const statsRef = doc(firestore, STATS_DOC_PATH);
    await setDoc(statsRef, {
      maxQueueLength: 0,
      maxWaitTime: 0,
      lastUpdated: Date.now(),
    });
    // eslint-disable-next-line no-console
    console.log('Global stats reset');
  } catch (error) {
    console.error('Error resetting global stats:', error);
  }
}
