'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { updateMotionSample } from '@/lib/motion-service';

interface UseAccelerometerOptions {
  enabled: boolean;
  sessionId: string | null;
  throttleMs?: number;
}

interface MotionSample {
  x: number;
  y: number;
  z: number;
}

interface UseAccelerometerReturn {
  hasPermission: boolean;
  isSupported: boolean;
  lastSample: MotionSample | null;
  error: string | null;
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook to stream accelerometer data from the client device to Firebase.
 *
 * - Call `requestPermission` from a user gesture (e.g. button click) on iOS.
 * - When `enabled` is true and permission is granted, samples are
 *   written to /motionValues/current at the configured throttle rate.
 */
export function useAccelerometerStreaming(
  options: UseAccelerometerOptions
): UseAccelerometerReturn {
  const { enabled, sessionId, throttleMs = 50 } = options;

  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSample, setLastSample] = useState<MotionSample | null>(null);

  const lastSampleRef = useRef<MotionSample | null>(null);

  // Detect basic support once on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const win = window as unknown as {
      DeviceMotionEvent?: typeof DeviceMotionEvent;
    };

    if ('DeviceMotionEvent' in win) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') {
      setError('Motion not available in this environment');
      return false;
    }

    const win = window as unknown as {
      DeviceMotionEvent?: typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
    };

    if (!('DeviceMotionEvent' in win)) {
      setIsSupported(false);
      setError('DeviceMotionEvent not supported on this device/browser');
      return false;
    }

    setIsSupported(true);

    try {
      if (win.DeviceMotionEvent?.requestPermission) {
        const result = await win.DeviceMotionEvent.requestPermission();
        if (result !== 'granted') {
          setError('Motion permission not granted');
          setHasPermission(false);
          return false;
        }
      }

      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('Error requesting motion permission', err);
      setError('Error requesting motion permission');
      setHasPermission(false);
      return false;
    }
  }, []);

  // When enabled + permission granted, listen for devicemotion and push samples
  useEffect(() => {
    if (!enabled || !sessionId || !hasPermission) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;

      const sample: MotionSample = {
        x: acc.x ?? 0,
        y: acc.y ?? 0,
        z: acc.z ?? 0,
      };

      lastSampleRef.current = sample;
      setLastSample(sample);
    };

    window.addEventListener('devicemotion', handleMotion);

    const intervalId = window.setInterval(() => {
      if (!lastSampleRef.current || !sessionId) return;

      void updateMotionSample({
        x: lastSampleRef.current.x,
        y: lastSampleRef.current.y,
        z: lastSampleRef.current.z,
        sessionId,
      });
    }, throttleMs);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.clearInterval(intervalId);
    };
  }, [enabled, sessionId, hasPermission, throttleMs]);

  return {
    hasPermission,
    isSupported,
    lastSample,
    error,
    requestPermission,
  };
}
