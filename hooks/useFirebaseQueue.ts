'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { firebaseQueueManager, QueueState } from '../lib/queue-manager';

interface UseFirebaseQueueReturn {
  isConnected: boolean;
  sessionId: string | null;
  isActive: boolean;
  queuePosition: number;
  queueLength: number;
  remainingTime: number;
  joinQueue: () => void;
  rejoinQueue: () => void;
  submitTheme: (row1: string, row2: string, row3: string) => Promise<void>;
}

export function useFirebaseQueue(): UseFirebaseQueueReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [queuePosition, setQueuePosition] = useState(-1);
  const [queueLength, setQueueLength] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);

  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const queueUnsubscribe = useRef<(() => void) | null>(null);
  const isActiveRef = useRef(false);
  const hasDeactivated = useRef(false);

  // Initialize session ID
  useEffect(() => {
    // Check for existing session in localStorage
    let storedSessionId = localStorage.getItem('christmasThemeSessionId');

    if (!storedSessionId) {
      // Generate new session ID using the queue manager
      storedSessionId = firebaseQueueManager.generateSessionId();
      localStorage.setItem('christmasThemeSessionId', storedSessionId);
    }

    setSessionId(storedSessionId);
    setIsConnected(true); // Firebase is always connected
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    setRemainingTime(0);
  }, []);

  // Countdown timer for active user
  const startCountdown = useCallback(
    (endTime: number) => {
      stopCountdown(); // Clear any existing countdown

      const updateRemainingTime = () => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        setRemainingTime(remaining);

        if (remaining === 0) {
          // Set flag FIRST to prevent race conditions
          if (isActiveRef.current && sessionId && !hasDeactivated.current) {
            hasDeactivated.current = true; // Set immediately to block other calls
            stopCountdown(); // Stop timer before async operation

            // eslint-disable-next-line no-console
            console.log('Deactivating user:', sessionId);
            firebaseQueueManager.deactivateCurrentUser(sessionId).catch((err) => {
              // eslint-disable-next-line no-console
              console.error('Error deactivating user:', err);
              // Reset flag on error so user can retry
              hasDeactivated.current = false;
            });
          } else if (remaining === 0) {
            stopCountdown();
          }
        }
      };

      // Update immediately
      updateRemainingTime();

      // Update every 100ms for smooth countdown
      countdownInterval.current = setInterval(updateRemainingTime, 100);
    },
    [stopCountdown, sessionId]
  );

  // Setup Firebase listeners and initialize queue
  useEffect(() => {
    if (!sessionId) return;

    // Ensure the queue system is initialized (activates first user if needed)
    firebaseQueueManager.initializeQueue();

    // Listen to queue state changes
    queueUnsubscribe.current = firebaseQueueManager.listenToQueueState((queueState: QueueState) => {
      setQueueLength(queueState.queueLength);

      // Check if current user is active (make sure activeUser is an object, not "none")
      const userIsActive = !!(
        queueState.activeUser &&
        typeof queueState.activeUser === 'object' &&
        queueState.activeUser.sessionId === sessionId
      );
      setIsActive(userIsActive);
      isActiveRef.current = userIsActive;

      if (userIsActive && queueState.activeUser && typeof queueState.activeUser === 'object') {
        setQueuePosition(0);
        // Only reset hasDeactivated if we're becoming active for the first time
        if (!isActiveRef.current) {
          hasDeactivated.current = false;
        }
        startCountdown(queueState.activeUser.endTime);
      } else {
        // Check position in waiting queue
        const userInQueue = queueState.waitingUsers[sessionId];
        if (userInQueue && userInQueue.position !== undefined) {
          setQueuePosition(userInQueue.position);
        } else {
          setQueuePosition(-1); // Not in queue
        }
        stopCountdown();
        // Only reset flag when truly no longer active
        if (isActiveRef.current) {
          hasDeactivated.current = false;
        }
      }
    });

    return () => {
      if (queueUnsubscribe.current) {
        queueUnsubscribe.current();
      }
      stopCountdown();
      firebaseQueueManager.cleanup();
    };
  }, [sessionId, startCountdown, stopCountdown]);

  // Queue operations
  const joinQueue = useCallback(async () => {
    if (!sessionId) return;

    try {
      await firebaseQueueManager.joinQueue(sessionId);
      // eslint-disable-next-line no-console
      console.log('Joined queue successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error joining queue:', error);
    }
  }, [sessionId]);

  const rejoinQueue = useCallback(async () => {
    // Same as join queue for simplicity
    await joinQueue();
  }, [joinQueue]);

  // Submit theme selection and join queue
  const submitTheme = useCallback(
    async (row1: string, row2: string, row3: string) => {
      if (!sessionId) return;

      try {
        // Store theme selection
        await firebaseQueueManager.storeThemeSelection(sessionId, row1, row2, row3);
        // Join queue
        await firebaseQueueManager.joinQueue(sessionId);
        // eslint-disable-next-line no-console
        console.log('Theme submitted and joined queue successfully');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error submitting theme:', error);
        throw error;
      }
    },
    [sessionId]
  );

  return {
    isConnected,
    sessionId,
    isActive,
    queuePosition,
    queueLength,
    remainingTime,
    joinQueue,
    rejoinQueue,
    submitTheme,
  };
}

// Export with the old name for backward compatibility
export const useSocket = useFirebaseQueue;
