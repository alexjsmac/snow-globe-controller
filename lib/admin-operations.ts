import { realtimeDb, firestore } from './firebase-config';
import { ref, remove, set, get, onValue, off } from 'firebase/database';
import { collection, getDocs, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import type { SessionSummary } from './types';

export interface QueueStatistics {
  activeUser: {
    sessionId: string;
    remainingTime: number;
    startTime: number;
  } | null;
  waitingUsers: Array<{
    sessionId: string;
    joinedAt: number;
    position: number;
  }>;
  queueLength: number;
  totalSessionsToday: number;
  averageSliderValue: number;  // Average of all session average values
  currentSliderValue: number | null;
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

      // Get current slider value
      const sliderRef = ref(realtimeDb, 'sliderValues/current');
      const sliderSnapshot = await get(sliderRef);
      const sliderData = sliderSnapshot.val();

      // Get today's sessions from Firestore
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();
      
      const sessionsRef = collection(firestore, 'sessions');
      const sessionsSnapshot = await getDocs(sessionsRef);
      
      let todaySessionCount = 0;
      let totalAverageValue = 0;
      
      sessionsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Handle different timestamp formats
        let startTimeMs: number;
        if (data.startTime?.seconds) {
          // Firestore Timestamp object
          startTimeMs = data.startTime.seconds * 1000;
        } else if (typeof data.startTime === 'number') {
          // Already a millisecond timestamp
          startTimeMs = data.startTime;
        } else {
          // Skip if we can't parse the timestamp
          return;
        }
        
        // Check if session is from today
        if (startTimeMs >= todayTimestamp) {
          todaySessionCount++;
          // Add the session's average slider value
          if (data.statistics?.average !== undefined) {
            totalAverageValue += data.statistics.average;
          }
        }
      });

      const averageSliderValue = todaySessionCount > 0 ? totalAverageValue / todaySessionCount : 0;

      // Format waiting users
      const waitingUsers = queueData.waitingUsers 
        ? Object.values(queueData.waitingUsers as Record<string, {
            sessionId: string;
            joinedAt: number;
            position?: number;
          }>).map((user) => ({
            sessionId: user.sessionId,
            joinedAt: user.joinedAt,
            position: user.position || 0,
          })).sort((a, b) => a.position - b.position)
        : [];

      // Calculate remaining time for active user
      let activeUser = null;
      if (queueData.activeUser) {
        const now = Date.now();
        const endTime = queueData.activeUser.endTime || now;
        const remainingTime = Math.max(0, Math.floor((endTime - now) / 1000));
        activeUser = {
          sessionId: queueData.activeUser.sessionId,
          remainingTime,
          startTime: queueData.activeUser.startTime,
        };
      }

      // Ensure currentSliderValue is properly set
      const currentSliderValue = sliderData && typeof sliderData.value === 'number' 
        ? sliderData.value 
        : null;

      return {
        activeUser,
        waitingUsers,
        queueLength: queueData.queueLength || 0,
        totalSessionsToday: todaySessionCount,
        averageSliderValue: averageSliderValue,  // Average of session averages
        currentSliderValue,
      };
    } catch (error) {
      console.error('Error getting queue statistics:', error);
      // Return a safe default state instead of throwing
      return {
        activeUser: null,
        waitingUsers: [],
        queueLength: 0,
        totalSessionsToday: 0,
        averageSliderValue: 0,
        currentSliderValue: null,
      };
    }
  }

  // Subscribe to real-time queue updates
  subscribeToQueueStats(callback: (stats: QueueStatistics) => void): () => void {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return () => {};
    }
    this.statsListener = callback;
    
    // Set up real-time listeners
    const queueRef = ref(realtimeDb, 'queue');
    const sliderRef = ref(realtimeDb, 'sliderValues/current');
    
    const updateStats = async () => {
      const stats = await this.getQueueStatistics();
      if (this.statsListener) {
        this.statsListener(stats);
      }
    };

    // Listen to queue changes
    onValue(queueRef, updateStats);
    onValue(sliderRef, updateStats);
    
    // Store unsubscribe functions
    const unsubQueue = () => {
      off(queueRef, 'value', updateStats);
    };
    const unsubSlider = () => {
      off(sliderRef, 'value', updateStats);
    };
    
    this.unsubscribes.push(unsubQueue, unsubSlider);

    // Initial update
    updateStats();

    // Return unsubscribe function
    return () => {
      this.unsubscribes.forEach(unsub => unsub());
      this.unsubscribes = [];
      this.statsListener = null;
    };
  }

  // Reset queue with options
  async resetQueue(options: ResetOptions = {}): Promise<ResetResult> {
    if (!realtimeDb || !firestore) {
      return {
        success: false,
        errors: ['Firebase is not initialized']
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
        const sliderRef = ref(realtimeDb, 'sliderValues');
        promises.push(remove(sliderRef));
      }

      if (options.clearSessions) {
        // Clear Firestore sessions
        const sessionsRef = collection(firestore, 'sessions');
        const snapshot = await getDocs(sessionsRef);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        promises.push(...deletePromises);
        
        console.log(`Deleting ${snapshot.size} Firestore session(s)`);

        // Clear Realtime Database sessions
        const rtdbSessionsRef = ref(realtimeDb, 'sessions');
        promises.push(remove(rtdbSessionsRef));
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
      }

      return {
        success: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error resetting queue:', error);
      return {
        success: false,
        errors: [`Reset failed: ${error}`]
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
    snapshot.forEach((doc) => {
      const data = doc.data();
      
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
        sessionId: doc.id,
        startTime,
        endTime,
        duration: data.duration || 0,
        dataPoints: data.dataPoints || 0,
        statistics: data.statistics || { average: 0, min: 0, max: 0, standardDeviation: 0 }
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
        const remainingUsers = Object.values(queueData.waitingUsers as Record<string, {
            sessionId: string;
            position: number;
          }>)
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