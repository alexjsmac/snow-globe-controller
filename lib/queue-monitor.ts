/**
 * Queue Monitor (client-side)
 *
 * This used to manage turn timeouts and advance the queue from the browser.
 * Now that a backend Cloud Function is responsible for all time-based
 * progression, this module is intentionally a no-op. It exists only to
 * preserve the public API used by QueueMonitorProvider.
 */
export class QueueMonitor {
  // Start monitoring – no-op by design (clients are observers only)
  startMonitoring(_intervalMs: number = 1000): void {
    // intentionally empty
  }

  // Stop monitoring – no-op
  stopMonitoring(): void {
    // intentionally empty
  }
}

// Singleton instance used by QueueMonitorProvider
export const queueMonitor = new QueueMonitor();
