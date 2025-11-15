'use client';

import { useEffect } from 'react';
import { queueMonitor } from '@/lib/queue-monitor';

export function QueueMonitorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Start monitoring when the app loads
    queueMonitor.startMonitoring(2000); // Check every 2 seconds

    // Cleanup on unmount
    return () => {
      queueMonitor.stopMonitoring();
    };
  }, []);

  return <>{children}</>;
}
