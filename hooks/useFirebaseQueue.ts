'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { firebaseQueueManager, QueueState, SliderData, ActiveUser } from '../lib/queue-manager';

interface UseFirebaseQueueReturn {
  isConnected: boolean;
  sessionId: string | null;
  isActive: boolean;
  queuePosition: number;
  queueLength: number;
  remainingTime: number;
  joinQueue: () => void;
  rejoinQueue: () => void;
  sendSliderValue: (value: number) => void;
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
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize session ID
  useEffect(() => {
    // Check for existing session in localStorage
    let storedSessionId = localStorage.getItem('sliderSessionId');
    
    if (!storedSessionId) {
      // Generate new session ID using the queue manager
      storedSessionId = firebaseQueueManager.generateSessionId();
      localStorage.setItem('sliderSessionId', storedSessionId);
    }
    
    setSessionId(storedSessionId);
    setIsConnected(true); // Firebase is always connected
  }, []);

  // Setup Firebase listeners
  useEffect(() => {
    if (!sessionId) return;

    // Initialize the queue system
    firebaseQueueManager.initializeQueue();

    // Listen to queue state changes
    queueUnsubscribe.current = firebaseQueueManager.listenToQueueState((queueState: QueueState) => {
      setQueueLength(queueState.queueLength);

      // Check if current user is active
      const userIsActive = queueState.activeUser?.sessionId === sessionId;
      setIsActive(userIsActive);

      if (userIsActive && queueState.activeUser) {
        setQueuePosition(0);
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
      }
    });

    return () => {
      if (queueUnsubscribe.current) {
        queueUnsubscribe.current();
      }
      stopCountdown();
      firebaseQueueManager.cleanup();
    };
  }, [sessionId]);

  // Countdown timer for active user
  const startCountdown = useCallback((endTime: number) => {
    stopCountdown(); // Clear any existing countdown

    const updateRemainingTime = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRemainingTime(remaining);

      if (remaining === 0) {
        stopCountdown();
      }
    };

    // Update immediately
    updateRemainingTime();

    // Update every 100ms for smooth countdown
    countdownInterval.current = setInterval(updateRemainingTime, 100);
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    setRemainingTime(0);
  }, []);

  // Queue operations
  const joinQueue = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      await firebaseQueueManager.joinQueue(sessionId);
      console.log('Joined queue successfully');
    } catch (error) {
      console.error('Error joining queue:', error);
    }
  }, [sessionId]);

  const rejoinQueue = useCallback(async () => {
    // Same as join queue for simplicity
    await joinQueue();
  }, [joinQueue]);

  // Throttled slider value sending
  const sendSliderValue = useCallback((value: number) => {
    if (!sessionId || !isActive) return;

    // Throttle to 100ms (10 updates per second)
    if (throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
    }

    throttleTimeout.current = setTimeout(async () => {
      try {
        await firebaseQueueManager.updateSliderValue(sessionId, value);
      } catch (error) {
        console.error('Error sending slider value:', error);
      }
    }, 100);
  }, [sessionId, isActive]);

  // Submit theme selection and join queue
  const submitTheme = useCallback(async (row1: string, row2: string, row3: string) => {
    if (!sessionId) return;
    
    try {
      // Store theme selection
      await firebaseQueueManager.storeThemeSelection(sessionId, row1, row2, row3);
      // Join queue
      await firebaseQueueManager.joinQueue(sessionId);
      console.log('Theme submitted and joined queue successfully');
    } catch (error) {
      console.error('Error submitting theme:', error);
      throw error;
    }
  }, [sessionId]);

  return {
    isConnected,
    sessionId,
    isActive,
    queuePosition,
    queueLength,
    remainingTime,
    joinQueue,
    rejoinQueue,
    sendSliderValue,
    submitTheme
  };
}

// Export with the old name for backward compatibility
export const useSocket = useFirebaseQueue;
