import { realtimeDb } from './firebase-config';
import {
  ref,
  set,
  remove,
  onValue,
  off,
  serverTimestamp as rtdbServerTimestamp,
  get,
} from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { updateThemeSelection, resetThemeSelection } from './theme-service';
import { resetMotionSample } from './motion-service';
import { saveThemeSession } from './session-service';
import type { QueueUser, ActiveUser, QueueState } from './types';

// Re-export types for convenience
export type { QueueUser, ActiveUser, QueueState };

/**
 * Firebase Queue Manager
 * Manages queue state using Firebase Realtime Database
 */
export class FirebaseQueueManager {
  private queueUnsubscribe: (() => void) | null = null;

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

      console.warn(`User ${sessionId} joined queue`);

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

      // Also remove any stored theme selection for this session
      const themeRef = ref(realtimeDb, `queue/themes/${sessionId}`);
      await remove(themeRef);

      // Update queue length
      await this.updateQueueLength();

      console.warn(`User ${sessionId} left queue`);
    } catch (error) {
      console.error('Error leaving queue:', error);
      throw error;
    }
  }

  /**
   * Store theme selection when user joins queue
   */
  async storeThemeSelection(
    sessionId: string,
    row1: string,
    row2: string,
    row3: string
  ): Promise<void> {
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
      console.warn(`Theme selection stored for ${sessionId}`);
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

      onValue(
        waitingUsersRef,
        async (snapshot) => {
          const waitingUsers = snapshot.val() as { [sessionId: string]: QueueUser } | null;

          if (!waitingUsers || Object.keys(waitingUsers).length === 0) {
            // No users in queue, just return
            console.warn('No users in queue to activate');
            return;
          }

          // Find user with earliest joinedAt timestamp
          const sortedUsers = Object.values(waitingUsers).sort((a, b) => a.joinedAt - b.joinedAt);
          const nextUser = sortedUsers[0];

          if (nextUser) {
            const now = Date.now();
            const endTime = now + 60 * 1000; // 60 seconds (1 minute) from now

            // IMPORTANT: Publish the user's theme BEFORE removing them from queue
            const userThemeRef = ref(db, `queue/themes/${nextUser.sessionId}`);
            const themeSnapshot = await get(userThemeRef);
            const themeData = themeSnapshot.val();

            if (themeData && themeData.row1 && themeData.row2 && themeData.row3) {
              await updateThemeSelection(
                themeData.row1,
                themeData.row2,
                themeData.row3,
                nextUser.sessionId
              );
              console.warn(`Theme published for ${nextUser.sessionId}:`, themeData);
            } else {
              console.warn(`No theme data found for ${nextUser.sessionId}`);
            }

            // Set as active user
            const activeUserRef = ref(db, 'queue/activeUser');
            await set(activeUserRef, {
              sessionId: nextUser.sessionId,
              startTime: now,
              endTime,
              remainingTime: 60,
            });

            // Remove from waiting queue but DON'T delete theme - we need it for session saving
            const userRef = ref(db, `queue/waitingUsers/${nextUser.sessionId}`);
            await remove(userRef);
            await this.updateQueueLength();
            console.warn(
              `User ${nextUser.sessionId} removed from waiting queue (theme preserved for session saving)`
            );

            // Set timer to deactivate after 60 seconds
            setTimeout(() => {
              this.deactivateCurrentUser();
            }, 60000);

            console.warn(`User ${nextUser.sessionId} activated`);
          }
        },
        { onlyOnce: true }
      );
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
      onValue(
        activeUserRef,
        async (snapshot) => {
          const activeUser = snapshot.val() as ActiveUser | 'none' | null;

          // Type guard: Check if activeUser is a valid ActiveUser object (not null, not "none")
          if (!activeUser || activeUser === 'none' || typeof activeUser !== 'object') {
            return;
          }

          // Save session data before removing active user
          try {
            const userThemeRef = ref(db, `queue/themes/${activeUser.sessionId}`);
            const themeSnapshot = await get(userThemeRef);
            const themeData = themeSnapshot.val();

            if (themeData) {
              const queueJoinTime = themeData.submittedAt || activeUser.startTime;
              const queueWaitTime = Math.max(
                0,
                Math.floor((activeUser.startTime - queueJoinTime) / 1000)
              );

              const sessionData = {
                sessionId: activeUser.sessionId,
                startTime: activeUser.startTime,
                endTime: Date.now(),
                duration: 60, // 60 second turns
                queueJoinTime: queueJoinTime,
                queueWaitTime: queueWaitTime,
                theme: {
                  row1: themeData.row1,
                  row2: themeData.row2,
                  row3: themeData.row3,
                },
              };

              await saveThemeSession(sessionData);

              // Once the session is saved, NOW we can remove the stored theme
              await remove(userThemeRef);

              console.warn(`Session saved for ${activeUser.sessionId} - waited ${queueWaitTime}s`);
            } else {
              console.warn(`No theme data found for ${activeUser.sessionId} - session not saved`);
            }
          } catch (error) {
            console.error('Error saving session:', error);
          }

          // Check if queue is empty or activate next user
          const waitingUsersRef = ref(db, 'queue/waitingUsers');
          const waitingSnapshot = await get(waitingUsersRef);
          const waitingUsers = waitingSnapshot.val();
          const queueEmpty = !waitingUsers || Object.keys(waitingUsers).length === 0;

          if (queueEmpty) {
            console.warn('Queue empty - resetting to idle state');
            // Set activeUser to "none" instead of removing it
            await set(activeUserRef, 'none');
            // Reset theme values and motion values to "none" / neutral
            await resetThemeSelection();
            await resetMotionSample();
          } else {
            // Remove active user before activating next
            await remove(activeUserRef);
            console.warn(`User ${activeUser.sessionId} deactivated, activating next user`);
            // Activate next user if queue not empty
            setTimeout(() => this.activateNextUser(), 100);
          }
        },
        { onlyOnce: true }
      );
    } catch (error) {
      console.error('Error in deactivateCurrentUser:', error);
      throw error;
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

      onValue(
        activeUserRef,
        async (snapshot) => {
          const activeUser = snapshot.val();

          // If no active user (null, "none", or undefined), try to activate the next user from queue
          if (!activeUser || activeUser === 'none') {
            console.warn('No active user found, attempting to activate next user');
            await this.activateNextUser();
          }
        },
        { onlyOnce: true }
      );
    } catch (error) {
      console.error('Error checking and activating next user:', error);
    }
  }

  /**
   * Update queue length counter
   */
  private async updateQueueLength(): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    const db = realtimeDb; // Capture for use in callbacks
    try {
      const waitingUsersRef = ref(db, 'queue/waitingUsers');

      onValue(
        waitingUsersRef,
        async (snapshot) => {
          const waitingUsers = snapshot.val();
          const count = waitingUsers ? Object.keys(waitingUsers).length : 0;

          const queueLengthRef = ref(db, 'queue/queueLength');
          await set(queueLengthRef, count);

          // If there are no waiting users, and also no active user,
          // reset the theme and motion values so TouchDesigner sees the idle state.
          if (count === 0) {
            const activeUserRef = ref(db, 'queue/activeUser');
            onValue(
              activeUserRef,
              async (activeSnapshot) => {
                const activeUser = activeSnapshot.val() as ActiveUser | 'none' | null;
                if (!activeUser || activeUser === 'none') {
                  await resetThemeSelection();
                  await resetMotionSample();
                }
              },
              { onlyOnce: true }
            );
          }
        },
        { onlyOnce: true }
      );
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
        queueLength: data.queueLength || 0,
      };

      // Calculate positions for waiting users
      if (queueState.waitingUsers) {
        const sortedUsers = Object.values(queueState.waitingUsers).sort(
          (a, b) => a.joinedAt - b.joinedAt
        );
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
   * Get current queue position for a user
   */
  async getCurrentPosition(sessionId: string): Promise<number> {
    return new Promise((resolve) => {
      this.listenToQueueState((queueState) => {
        // Check if user is active (make sure activeUser is an object, not "none")
        if (
          queueState.activeUser &&
          typeof queueState.activeUser === 'object' &&
          queueState.activeUser.sessionId === sessionId
        ) {
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

      onValue(
        activeUserRef,
        async (snapshot) => {
          const activeUser = snapshot.val() as ActiveUser | null;

          // If no active user, try to activate next from queue
          if (!activeUser) {
            await this.activateNextUser();
          }
        },
        { onlyOnce: true }
      );
    } catch (error) {
      console.error('Error initializing queue:', error);
    }
  }

  /**
   * Cleanup - remove all listeners
   */
  cleanup(): void {
    // Cleanup if needed
  }
}

// Export singleton instance
export const firebaseQueueManager = new FirebaseQueueManager();
