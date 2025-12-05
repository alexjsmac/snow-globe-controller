import { realtimeDb, firestore } from './firebase-config';
import { ref, remove, set, get, onValue, off } from 'firebase/database';
import {
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { resetThemeSelection } from './theme-service';
import { resetMotionSample } from './motion-service';
import { getGlobalStats, resetGlobalStats } from './stats-service';
import type { SessionSummary } from './types';

export interface QueueStatistics {
  activeUser: {
    sessionId: string;
    remainingTime: number;
    startTime: number;
    theme?: {
      row1: string;
      row2: string;
      row3: string;
    };
  } | null;
  waitingUsers: Array<{
    sessionId: string;
    joinedAt: number;
    position: number;
    theme?: {
      row1: string;
      row2: string;
      row3: string;
    };
  }>;
  queueLength: number;
  totalSessions: number;
  maxQueueLength: number;
  maxWaitTime: number; // in seconds
  currentTheme: {
    row1: string;
    row2: string;
    row3: string;
  } | null;
}

export interface ResetOptions {
  clearQueue?: boolean;
  clearSliderValues?: boolean;
  clearSessions?: boolean;
  clearSystemState?: boolean;
  initialize?: boolean;
}

export interface ResetResult {
  success: boolean;
  errors: string[];
}

class AdminOperations {
  private statsListener: ((stats: QueueStatistics) => void) | null = null;
  private unsubscribes: Array<() => void> = [];

  // Get real-time queue statistics
  async getQueueStatistics(): Promise<QueueStatistics> {
    if (!realtimeDb || !firestore) {
      throw new Error('Firebase is not initialized');
    }
    try {
      // Get queue data
      const queueRef = ref(realtimeDb, 'queue');
      const queueSnapshot = await get(queueRef);
      const queueData = queueSnapshot.val() || {};

      // Get current theme value
      const themeRef = ref(realtimeDb, 'themeValues/current');
      const themeSnapshot = await get(themeRef);
      const themeData = themeSnapshot.val();

      // Get all sessions from Firestore
      const sessionsRef = collection(firestore, 'sessions');
      const sessionsSnapshot = await getDocs(sessionsRef);
      const totalSessionCount = sessionsSnapshot.size;

      // Get global stats from Firestore
      const globalStats = await getGlobalStats();

      // Format waiting users and fetch their themes
      const waitingUsers = queueData.waitingUsers
        ? await Promise.all(
            Object.values(
              queueData.waitingUsers as Record<
                string,
                {
                  sessionId: string;
                  joinedAt: number;
                  position?: number;
                }
              >
            )
              .sort((a, b) => a.joinedAt - b.joinedAt)
              .map(async (user, index) => {
                // Get theme for this user
                let userTheme = null;
                if (realtimeDb) {
                  const userThemeRef = ref(realtimeDb, `queue/themes/${user.sessionId}`);
                  const userThemeSnapshot = await get(userThemeRef);
                  userTheme = userThemeSnapshot.val();
                }

                return {
                  sessionId: user.sessionId,
                  joinedAt: user.joinedAt,
                  position: index + 1,
                  theme: userTheme
                    ? {
                        row1: userTheme.row1,
                        row2: userTheme.row2,
                        row3: userTheme.row3,
                      }
                    : undefined,
                };
              })
          )
        : [];

      // Calculate remaining time for active user
      let activeUser = null;
      if (queueData.activeUser && queueData.activeUser !== 'none') {
        const now = Date.now();
        const endTime = queueData.activeUser.endTime || now;
        const remainingTime = Math.max(0, Math.floor((endTime - now) / 1000));

        // Get theme for active user
        let activeTheme = null;
        if (realtimeDb) {
          const activeThemeRef = ref(realtimeDb, `queue/themes/${queueData.activeUser.sessionId}`);
          const activeThemeSnapshot = await get(activeThemeRef);
          activeTheme = activeThemeSnapshot.val();
        }

        activeUser = {
          sessionId: queueData.activeUser.sessionId,
          remainingTime,
          startTime: queueData.activeUser.startTime,
          theme: activeTheme
            ? {
                row1: activeTheme.row1,
                row2: activeTheme.row2,
                row3: activeTheme.row3,
              }
            : undefined,
        };
      }

      // Get current theme being displayed
      const currentTheme =
        themeData && themeData.row1 && themeData.row2 && themeData.row3
          ? {
              row1: themeData.row1,
              row2: themeData.row2,
              row3: themeData.row3,
            }
          : null;

      // Get max stats from Firestore global stats
      const maxQueueLength = globalStats.maxQueueLength;
      const maxWaitTime = globalStats.maxWaitTime;

      return {
        activeUser,
        waitingUsers,
        queueLength: queueData.queueLength || 0,
        totalSessions: totalSessionCount,
        maxQueueLength,
        maxWaitTime,
        currentTheme,
      };
    } catch (error) {
      console.error('Error getting queue statistics:', error);
      // Return a safe default state instead of throwing
      return {
        activeUser: null,
        waitingUsers: [],
        queueLength: 0,
        totalSessions: 0,
        maxQueueLength: 0,
        maxWaitTime: 0,
        currentTheme: null,
      };
    }
  }

  // Subscribe to real-time queue updates
  subscribeToQueueStats(callback: (stats: QueueStatistics) => void): () => void {
    if (!realtimeDb || !firestore) {
      console.error('Firebase is not initialized');
      return () => {};
    }
    this.statsListener = callback;

    // Set up real-time listeners
    const queueRef = ref(realtimeDb, 'queue');
    const themeRef = ref(realtimeDb, 'themeValues/current');

    const updateStats = async () => {
      const stats = await this.getQueueStatistics();
      if (this.statsListener) {
        this.statsListener(stats);
      }
    };

    // Listen to queue changes
    onValue(queueRef, updateStats);
    onValue(themeRef, updateStats);

    // Listen to Firestore global stats changes
    const statsDocRef = doc(firestore, 'stats/global');
    const unsubStats = onSnapshot(statsDocRef, () => {
      updateStats();
    });

    // Store unsubscribe functions
    const unsubQueue = () => {
      off(queueRef, 'value', updateStats);
    };
    const unsubTheme = () => {
      off(themeRef, 'value', updateStats);
    };

    this.unsubscribes.push(unsubQueue, unsubTheme, unsubStats);

    // Initial update
    updateStats();

    // Return unsubscribe function
    return () => {
      this.unsubscribes.forEach((unsub) => unsub());
      this.unsubscribes = [];
      this.statsListener = null;
    };
  }

  // Reset queue with options
  async resetQueue(options: ResetOptions = {}): Promise<ResetResult> {
    if (!realtimeDb || !firestore) {
      return {
        success: false,
        errors: ['Firebase is not initialized'],
      };
    }
    try {
      const promises: Promise<void>[] = [];
      const errors: string[] = [];

      if (options.clearQueue !== false) {
        const queueRef = ref(realtimeDb, 'queue');
        promises.push(remove(queueRef));
      }

      if (options.clearSliderValues !== false) {
        // Clear theme values
        const themeValuesRef = ref(realtimeDb, 'themeValues');
        promises.push(remove(themeValuesRef));
      }

      if (options.clearSessions) {
        // Clear Firestore sessions
        const sessionsRef = collection(firestore, 'sessions');
        const snapshot = await getDocs(sessionsRef);
        const deletePromises = snapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref));
        promises.push(...deletePromises);

        console.warn(`Deleting ${snapshot.size} Firestore session(s)`);

        // Clear Realtime Database sessions
        const rtdbSessionsRef = ref(realtimeDb, 'sessions');
        promises.push(remove(rtdbSessionsRef));

        // Reset global stats when clearing sessions
        promises.push(resetGlobalStats());
      }

      if (options.clearSystemState) {
        // Try to clear system state, but handle permission errors
        try {
          const systemRef = ref(realtimeDb, 'systemState');
          await remove(systemRef);
        } catch (error) {
          const err = error as { code?: string };
          if (err.code === 'PERMISSION_DENIED') {
            console.warn('Cannot clear system state - requires authentication');
          } else {
            throw error;
          }
        }
      }

      // Wait for all deletions to complete
      await Promise.all(promises);

      // Initialize empty queue structure if requested
      if (options.initialize !== false) {
        const queueRef = ref(realtimeDb, 'queue');
        await set(queueRef, {
          activeUser: null,
          waitingUsers: {},
          queueLength: 0,
        });

        // Also initialize themeValues/current and motionValues/current
        // so TouchDesigner always sees a stable JSON object when idle.
        await resetThemeSelection();
        await resetMotionSample();
      }

      return {
        success: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.error('Error resetting queue:', error);
      return {
        success: false,
        errors: [`Reset failed: ${error}`],
      };
    }
  }

  // Get recent sessions
  async getRecentSessions(limitCount: number = 10): Promise<SessionSummary[]> {
    if (!firestore) {
      console.error('Firestore is not initialized');
      return [];
    }
    const sessionsRef = collection(firestore, 'sessions');
    const q = query(sessionsRef, orderBy('startTime', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);

    const sessions: SessionSummary[] = [];
    snapshot.forEach((sessionDoc) => {
      const data = sessionDoc.data();

      // Convert Firestore timestamps to milliseconds
      let startTime: number;
      let endTime: number;

      if (data.startTime?.seconds) {
        startTime = data.startTime.seconds * 1000;
      } else {
        startTime = data.startTime;
      }

      if (data.endTime?.seconds) {
        endTime = data.endTime.seconds * 1000;
      } else {
        endTime = data.endTime;
      }

      sessions.push({
        sessionId: data.sessionId || sessionDoc.id,
        startTime,
        endTime,
        duration: data.duration || 0,
        queueJoinTime: data.queueJoinTime,
        queueWaitTime: data.queueWaitTime,
        theme: data.theme,
        // Legacy fields for old slider sessions
        dataPoints: data.dataPoints,
        statistics: data.statistics,
      });
    });

    return sessions;
  }

  // Remove specific user from queue
  async removeUserFromQueue(sessionId: string): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    try {
      // Check if user is active
      const queueRef = ref(realtimeDb, 'queue');
      const snapshot = await get(queueRef);
      const queueData = snapshot.val();

      if (queueData?.activeUser?.sessionId === sessionId) {
        // If active user, clear active user and activate next in queue
        await set(ref(realtimeDb, 'queue/activeUser'), null);

        // The queue manager will automatically activate the next user
      } else if (queueData?.waitingUsers?.[sessionId]) {
        // Remove from waiting users
        await remove(ref(realtimeDb, `queue/waitingUsers/${sessionId}`));

        // Update queue length
        const newLength = Math.max(0, (queueData.queueLength || 1) - 1);
        await set(ref(realtimeDb, 'queue/queueLength'), newLength);

        // Reposition remaining users
        const remainingUsers = Object.values(
          queueData.waitingUsers as Record<
            string,
            {
              sessionId: string;
              position: number;
            }
          >
        )
          .filter((u) => u.sessionId !== sessionId)
          .sort((a, b) => a.position - b.position);

        for (let i = 0; i < remainingUsers.length; i++) {
          const user = remainingUsers[i];
          await set(ref(realtimeDb, `queue/waitingUsers/${user.sessionId}/position`), i + 1);
        }
      }
    } catch (error) {
      console.error('Error removing user from queue:', error);
      throw error;
    }
  }

  // Skip current active user and move to next
  async skipActiveUser(): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    try {
      const queueRef = ref(realtimeDb, 'queue/activeUser');
      const snapshot = await get(queueRef);
      const activeUser = snapshot.val();

      if (activeUser) {
        // Set end time to now to trigger immediate transition
        await set(ref(realtimeDb, 'queue/activeUser/endTime'), Date.now());
      }
    } catch (error) {
      console.error('Error skipping active user:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const adminOps = new AdminOperations();
