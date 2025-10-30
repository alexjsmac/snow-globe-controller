import { firestore } from './firebase-config';
import { collection, addDoc } from 'firebase/firestore';
import type { SessionValueHistory } from './types';

/**
 * Calculate standard deviation for a set of values
 */
function calculateStandardDeviation(values: number[]): number {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b) / n;
  const variance = values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / n;
  return Math.sqrt(variance);
}

/**
 * Calculate session statistics from value history
 */
function calculateSessionStatistics(valueHistory: SessionValueHistory[]) {
  const values = valueHistory.map(h => h.value);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const standardDeviation = calculateStandardDeviation(values);
  
  return {
    average: avgValue,
    min: minValue,
    max: maxValue,
    standardDeviation
  };
}


/**
 * Send session summary to Firestore when a user's turn ends
 */
export async function saveSessionSummary(
  sessionId: string,
  startTime: Date,
  endTime: Date,
  valueHistory: SessionValueHistory[]
): Promise<void> {
  if (!firestore) {
    console.error('Firestore is not initialized');
    return;
  }
  try {
    if (valueHistory.length === 0) {
      console.log(`No data to save for session ${sessionId}`);
      return;
    }

    const sessionsCollection = collection(firestore, 'sessions');
    const statistics = calculateSessionStatistics(valueHistory);
    
    await addDoc(sessionsCollection, {
      sessionId,
      startTime: startTime.getTime(), // Save as timestamp for proper querying
      endTime: endTime.getTime(), // Save as timestamp for proper querying
      duration: Math.round((endTime.getTime() - startTime.getTime()) / 1000), // Duration in seconds
      dataPoints: valueHistory.length,
      statistics
    });

    console.log(`Session ${sessionId} summary saved to Firestore`);
  } catch (error) {
    console.error('Error saving session summary:', error);
    throw error;
  }
}

/**
 * Create a new session data collector
 */
export class SessionDataCollector {
  private sessionData: SessionValueHistory[] = [];
  private collectionInterval: NodeJS.Timeout | null = null;
  private lastValue = 0;

  /**
   * Start collecting data at regular intervals
   */
  startCollection(intervalMs = 100): void {
    this.stopCollection(); // Clear any existing interval
    this.sessionData = []; // Reset data

    this.collectionInterval = setInterval(() => {
      this.sessionData.push({
        timestamp: new Date(),
        value: this.lastValue
      });
    }, intervalMs);
  }

  /**
   * Stop collecting data
   */
  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  /**
   * Update the current value being tracked
   */
  updateValue(value: number): void {
    this.lastValue = value;
  }

  /**
   * Get collected session data
   */
  getSessionData(): SessionValueHistory[] {
    return [...this.sessionData];
  }

  /**
   * Clear collected data
   */
  clearData(): void {
    this.sessionData = [];
  }
}
