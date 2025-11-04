import { realtimeDb } from './firebase-config';
import { ref, set, remove, onValue, off, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { updateSliderValue } from './slider-service';
import { saveSessionSummary } from './session-service';
import type { 
  QueueUser, 
  ActiveUser, 
  QueueState, 
  SliderData, 
  SessionValueHistory 
} from './types';

// Re-export types for convenience
export type { QueueUser, ActiveUser, QueueState, SliderData };

/**
 * Firebase Queue Manager
 * Manages queue state using Firebase Realtime Database
 */
export class FirebaseQueueManager {
  private queueUnsubscribe: (() => void) | null = null;
  private sliderUnsubscribe: (() => void) | null = null;
  private activeSessionData: SessionValueHistory[] = [];
  private valueCollectionInterval: NodeJS.Timeout | null = null;
  private lastSliderValue: number = 0;

  /**
   * Generate a unique session ID for a user
   */
  generateSessionId(): string {
    return uuidv4();
  }

  /**
   * Join the queue
   */
  async joinQueue(sessionId: string): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    try {
      const userRef = ref(realtimeDb, `queue/waitingUsers/${sessionId}`);
      await set(userRef, {
        sessionId,
        joinedAt: rtdbServerTimestamp(),
      });

      // Update queue length
      await this.updateQueueLength();
      
      console.log(`User ${sessionId} joined queue`);
      
      // Check if we need to activate this user (if no one is currently active)
      await this.checkAndActivateNext();
      
    } catch (error) {
      console.error('Error joining queue:', error);
      throw error;
    }
  }

  /**
   * Leave the queue
   */
  async leaveQueue(sessionId: string): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    try {
      const userRef = ref(realtimeDb, `queue/waitingUsers/${sessionId}`);
      await remove(userRef);
      
      // Update queue length
      await this.updateQueueLength();
      
      console.log(`User ${sessionId} left queue`);
    } catch (error) {
      console.error('Error leaving queue:', error);
      throw error;
    }
  }

  /**
   * Update slider value (only if user is active)
   */
  async updateSliderValue(sessionId: string, value: number): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    const db = realtimeDb; // Capture for use in callback
    try {
      // Check if user is currently active
      const activeUserRef = ref(db, 'queue/activeUser');
      
      onValue(activeUserRef, async (snapshot) => {
        const activeUser = snapshot.val() as ActiveUser | null;
        
        if (activeUser && activeUser.sessionId === sessionId) {
          this.lastSliderValue = value;
          await updateSliderValue(value, sessionId);
        }
      }, { onlyOnce: true });
      
    } catch (error) {
      console.error('Error updating slider value:', error);
      throw error;
    }
  }

  /**
   * Store theme selection when user joins queue
   */
  async storeThemeSelection(sessionId: string, row1: string, row2: string, row3: string): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    try {
      const themeRef = ref(realtimeDb, `queue/themes/${sessionId}`);
      await set(themeRef, {
        row1,
        row2,
        row3,
        submittedAt: rtdbServerTimestamp(),
      });
      console.log(`Theme selection stored for ${sessionId}`);
    } catch (error) {
      console.error('Error storing theme selection:', error);
      throw error;
    }
  }

  /**
   * Activate the next user in queue
   */
  async activateNextUser(): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    const db = realtimeDb; // Capture for use in callback
    try {
      // Get the first user from waiting queue (oldest joinedAt)
      const waitingUsersRef = ref(db, 'queue/waitingUsers');
      
      onValue(waitingUsersRef, async (snapshot) => {
        const waitingUsers = snapshot.val() as { [sessionId: string]: QueueUser } | null;
        
        if (!waitingUsers || Object.keys(waitingUsers).length === 0) {
          // No users in queue, just return
          console.log('No users in queue to activate');
          return;
        }

        // Find user with earliest joinedAt timestamp
        const sortedUsers = Object.values(waitingUsers).sort((a, b) => a.joinedAt - b.joinedAt);
        const nextUser = sortedUsers[0];

        if (nextUser) {
          const now = Date.now();
          const endTime = now + 60 * 1000; // 60 seconds (1 minute) from now

          // Set as active user
          const activeUserRef = ref(db, 'queue/activeUser');
          await set(activeUserRef, {
            sessionId: nextUser.sessionId,
            startTime: now,
            endTime,
            remainingTime: 60
          });

          // Remove from waiting queue
          await this.leaveQueue(nextUser.sessionId);

          // Reset session data collection
          this.activeSessionData = [];
          this.startValueCollection();

          // Set timer to deactivate after 60 seconds
          setTimeout(() => {
            this.deactivateCurrentUser();
          }, 60000);

          console.log(`User ${nextUser.sessionId} activated`);
        }
      }, { onlyOnce: true });

    } catch (error) {
      console.error('Error activating next user:', error);
      throw error;
    }
  }

  /**
   * Deactivate current user and save their session
   */
  async deactivateCurrentUser(): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    const db = realtimeDb; // Capture for use in callbacks
    try {
      const activeUserRef = ref(db, 'queue/activeUser');
      
      // Get current active user before removing
      onValue(activeUserRef, async (snapshot) => {
        const activeUser = snapshot.val() as ActiveUser | null;
        
        if (activeUser) {
          // Stop value collection
          this.stopValueCollection();
          
          // Save session data to Firebase
          if (this.activeSessionData.length > 0) {
            const startTime = new Date(activeUser.startTime);
            const endTime = new Date();
            await saveSessionSummary(activeUser.sessionId, startTime, endTime, this.activeSessionData);
          }

          // Remove active user
          await remove(activeUserRef);

          // Reset slider value
          this.lastSliderValue = 0;
          
          console.log(`User ${activeUser.sessionId} deactivated`);

          // Check if queue is empty and reset slider if needed
          const waitingUsersRef = ref(db, 'queue/waitingUsers');
          onValue(waitingUsersRef, async (waitingSnapshot) => {
            const waitingUsers = waitingSnapshot.val();
            const queueEmpty = !waitingUsers || Object.keys(waitingUsers).length === 0;
            
            if (queueEmpty) {
              // No more users in queue, reset slider to 0
              await updateSliderValue(0, 'system');
              console.log('Last user deactivated and queue empty - reset slider value to 0');
            } else {
              // Activate next user if queue not empty
              setTimeout(() => this.activateNextUser(), 100);
            }
          }, { onlyOnce: true });
        }
      }, { onlyOnce: true });

    } catch (error) {
      console.error('Error deactivating current user:', error);
      throw error;
    }
  }

  /**
   * Start collecting slider values every 100ms during active session
   */
  private startValueCollection(): void {
    this.stopValueCollection(); // Clear any existing interval

    this.valueCollectionInterval = setInterval(() => {
      this.activeSessionData.push({
        timestamp: new Date(),
        value: this.lastSliderValue
      });
    }, 100);
  }

  /**
   * Stop collecting slider values
   */
  private stopValueCollection(): void {
    if (this.valueCollectionInterval) {
      clearInterval(this.valueCollectionInterval);
      this.valueCollectionInterval = null;
    }
  }

  /**
   * Check if there's an active user, and if not, activate the next user
   */
  async checkAndActivateNext(): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    const db = realtimeDb; // Capture for use in callback
    try {
      const activeUserRef = ref(db, 'queue/activeUser');
      
      onValue(activeUserRef, async (snapshot) => {
        const activeUser = snapshot.val() as ActiveUser | null;
        
        // If no active user, try to activate the next user from queue
        if (!activeUser) {
          console.log('No active user found, attempting to activate next user');
          await this.activateNextUser();
        }
      }, { onlyOnce: true });
      
    } catch (error) {
      console.error('Error checking and activating next user:', error);
    }
  }

  /**
   * Update queue length counter and reset slider value when queue is empty
   */
  private async updateQueueLength(): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    const db = realtimeDb; // Capture for use in callbacks
    try {
      const waitingUsersRef = ref(db, 'queue/waitingUsers');
      
      onValue(waitingUsersRef, async (snapshot) => {
        const waitingUsers = snapshot.val();
        const count = waitingUsers ? Object.keys(waitingUsers).length : 0;
        
        const queueLengthRef = ref(db, 'queue/queueLength');
        await set(queueLengthRef, count);
        
        // Reset slider value to 0 when queue becomes empty
        if (count === 0) {
          // Check if there's also no active user
          const activeUserRef = ref(db, 'queue/activeUser');
          onValue(activeUserRef, async (activeSnapshot) => {
            const activeUser = activeSnapshot.val();
            if (!activeUser) {
              // No users in queue and no active user, reset slider to 0
              await updateSliderValue(0, 'system');
              console.log('Queue empty - reset slider value to 0');
            }
          }, { onlyOnce: true });
        }
      }, { onlyOnce: true });
      
    } catch (error) {
      console.error('Error updating queue length:', error);
    }
  }

  /**
   * Listen to queue state changes
   */
  listenToQueueState(callback: (queueState: QueueState) => void): () => void {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return () => {};
    }
    const queueRef = ref(realtimeDb, 'queue');
    
    onValue(queueRef, (snapshot) => {
      const data = snapshot.val() || {};
      
      const queueState: QueueState = {
        activeUser: data.activeUser || null,
        waitingUsers: data.waitingUsers || {},
        queueLength: data.queueLength || 0
      };

      // Calculate positions for waiting users
      if (queueState.waitingUsers) {
        const sortedUsers = Object.values(queueState.waitingUsers).sort((a, b) => a.joinedAt - b.joinedAt);
        sortedUsers.forEach((user, index) => {
          if (queueState.waitingUsers[user.sessionId]) {
            queueState.waitingUsers[user.sessionId].position = index + 1;
          }
        });
      }

      callback(queueState);
    });

    return () => off(queueRef);
  }

  /**
   * Listen to slider value changes
   */
  listenToSliderValues(callback: (sliderData: SliderData | null) => void): () => void {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return () => {};
    }
    const sliderRef = ref(realtimeDb, 'sliderValues/current');
    
    onValue(sliderRef, (snapshot) => {
      const data = snapshot.val() as SliderData | null;
      callback(data);
    });

    return () => off(sliderRef);
  }

  /**
   * Get current queue position for a user
   */
  async getCurrentPosition(sessionId: string): Promise<number> {
    return new Promise((resolve) => {
      this.listenToQueueState((queueState) => {
        // Check if user is active
        if (queueState.activeUser?.sessionId === sessionId) {
          resolve(0);
          return;
        }

        // Check position in waiting queue
        const userInQueue = queueState.waitingUsers[sessionId];
        if (userInQueue && userInQueue.position !== undefined) {
          resolve(userInQueue.position);
        } else {
          resolve(-1); // Not in queue
        }
      });
    });
  }

  /**
   * Initialize queue system - activate first user if queue exists
   */
  async initializeQueue(): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    const db = realtimeDb; // Capture for use in callback
    try {
      const activeUserRef = ref(db, 'queue/activeUser');
      
      onValue(activeUserRef, async (snapshot) => {
        const activeUser = snapshot.val() as ActiveUser | null;
        
        // If no active user, try to activate next from queue
        if (!activeUser) {
          await this.activateNextUser();
        }
      }, { onlyOnce: true });
      
    } catch (error) {
      console.error('Error initializing queue:', error);
    }
  }

  /**
   * Cleanup - remove all listeners
   */
  cleanup(): void {
    this.stopValueCollection();
    // Additional cleanup if needed
  }
}

// Export singleton instance
export const firebaseQueueManager = new FirebaseQueueManager();
