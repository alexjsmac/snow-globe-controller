import { realtimeDb } from './firebase-config';
import { ref, get, set, remove } from 'firebase/database';
import type { ActiveUser, QueueUser } from './types';

/**
 * Queue Monitor - Checks for expired active users and advances the queue
 * This runs on the client side but checks server timestamps
 */
export class QueueMonitor {
  private monitorInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  /**
   * Start monitoring the queue for expired active users
   * @param intervalMs How often to check (default 1000ms)
   */
  startMonitoring(intervalMs: number = 1000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Check immediately
    this.checkAndAdvanceQueue();

    // Then check periodically
    this.monitorInterval = setInterval(() => {
      this.checkAndAdvanceQueue();
    }, intervalMs);
  }

  /**
   * Stop monitoring the queue
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Check if active user's time has expired and advance queue if needed
   */
  private async checkAndAdvanceQueue(): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    try {
      const activeUserRef = ref(realtimeDb, 'queue/activeUser');
      const snapshot = await get(activeUserRef);
      const activeUser = snapshot.val() as ActiveUser | null;

      if (!activeUser) {
        // No active user, try to activate next in queue
        await this.activateNextUser();
        return;
      }

      // Check if active user's time has expired
      const now = Date.now();
      if (activeUser.endTime && now >= activeUser.endTime) {
        console.warn(`⏰ Active user ${activeUser.sessionId} time expired, advancing queue`);

        // Remove the expired active user
        await remove(activeUserRef);

        // Activate the next user
        await this.activateNextUser();
      }
    } catch (error) {
      console.error('Error in queue monitor:', error);
    }
  }

  /**
   * Activate the next user in the waiting queue
   */
  private async activateNextUser(): Promise<void> {
    if (!realtimeDb) {
      console.error('Firebase Realtime Database is not initialized');
      return;
    }
    try {
      // Get waiting users
      const waitingUsersRef = ref(realtimeDb, 'queue/waitingUsers');
      const snapshot = await get(waitingUsersRef);
      const waitingUsers = snapshot.val() as { [sessionId: string]: QueueUser } | null;

      if (!waitingUsers || Object.keys(waitingUsers).length === 0) {
        // No users waiting
        return;
      }

      // Find user with earliest joinedAt timestamp (position 1)
      const sortedUsers = Object.values(waitingUsers).sort(
        (a, b) => (a.position || Number.MAX_VALUE) - (b.position || Number.MAX_VALUE)
      );
      const nextUser = sortedUsers[0];

      if (nextUser) {
        const now = Date.now();
        const endTime = now + 30 * 1000; // 30 seconds from now

        // Set as active user
        const activeUserRef = ref(realtimeDb, 'queue/activeUser');
        await set(activeUserRef, {
          sessionId: nextUser.sessionId,
          startTime: now,
          endTime,
          remainingTime: 30,
        });

        // Remove from waiting queue
        const userWaitingRef = ref(realtimeDb, `queue/waitingUsers/${nextUser.sessionId}`);
        await remove(userWaitingRef);

        // Update queue positions for remaining users
        const remainingUsers = Object.values(waitingUsers)
          .filter((u) => u.sessionId !== nextUser.sessionId)
          .sort((a, b) => (a.position || 0) - (b.position || 0));

        for (let i = 0; i < remainingUsers.length; i++) {
          const user = remainingUsers[i];
          const userRef = ref(realtimeDb, `queue/waitingUsers/${user.sessionId}/position`);
          await set(userRef, i + 1);
        }

        // Update queue length
        const queueLengthRef = ref(realtimeDb, 'queue/queueLength');
        await set(queueLengthRef, remainingUsers.length);

        console.warn(`✅ Activated user ${nextUser.sessionId} from queue monitor`);
      }
    } catch (error) {
      console.error('Error activating next user:', error);
    }
  }
}

// Create singleton instance
export const queueMonitor = new QueueMonitor();
