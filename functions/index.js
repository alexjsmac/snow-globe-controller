import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onValueWritten } from 'firebase-functions/v2/database';
import * as logger from 'firebase-functions/logger';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase, ServerValue } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize the Admin SDK once per function instance
const app = initializeApp();
const db = getDatabase(app);
const firestore = getFirestore(app);

/**
 * Scheduled function that periodically checks the queue's active user.
 *
 * If the active user's endTime has passed, this function:
 * - saves a session summary to Firestore (if theme data exists)
 * - removes the user's stored theme
 * - either clears the active user and resets theme/motion (if queue is empty)
 *   or activates the next waiting user and publishes their theme.
 *
 * Runs even when no web clients are connected, so turns always eventually end.
 */
export const checkExpiredTurns = onSchedule('every 1 minutes', async (_event) => {
  try {
    const queueSnap = await db.ref('queue').once('value');
    const queueData = queueSnap.val() || {};

    const activeUser = queueData.activeUser;

    // Nothing to do if there is no active user or it's explicitly marked as "none".
    if (!activeUser || activeUser === 'none' || typeof activeUser !== 'object') {
      return;
    }

    const { sessionId, startTime, endTime } = activeUser;

    if (!sessionId || typeof endTime !== 'number') {
      logger.warn('Active user missing sessionId or endTime, skipping', { activeUser });
      return;
    }

    const now = Date.now();

    // If the turn has not yet expired, do nothing.
    if (now < endTime) {
      return;
    }

    logger.info('Detected expired active user turn', { sessionId, endTime, now });

    // Fetch theme data for the expired user (if any)
    const userThemeRef = db.ref(`queue/themes/${sessionId}`);
    const themeSnap = await userThemeRef.once('value');
    const themeData = themeSnap.val();

    // Save session summary to Firestore if we have theme data
    if (themeData && themeData.row1 && themeData.row2 && themeData.row3) {
      try {
        const queueJoinTimeRaw = themeData.submittedAt || startTime;
        const queueJoinTime = typeof queueJoinTimeRaw === 'number' ? queueJoinTimeRaw : startTime;

        const queueWaitTime = Math.max(0, Math.floor((startTime - queueJoinTime) / 1000));

        const sessionDoc = {
          sessionId,
          startTime,
          endTime: now,
          // Keep a fixed logical duration of 60 seconds to match the UI,
          // even if cleanup happens slightly later.
          duration: 60,
          queueJoinTime,
          queueWaitTime,
          theme: {
            row1: themeData.row1,
            row2: themeData.row2,
            row3: themeData.row3,
          },
          createdAt: now,
        };

        await firestore.collection('sessions').add(sessionDoc);
        logger.info('Saved expired user session', { sessionId });
      } catch (err) {
        logger.error('Error saving session summary for expired user', {
          sessionId,
          error: err,
        });
        // Continue cleanup even if session logging fails
      }

      // Remove stored theme for the expired user to keep queue/themes tidy
      await userThemeRef.remove();
    } else {
      logger.warn('No theme data found for expired active user', { sessionId });
    }

    // Determine if there are any waiting users
    const waitingUsers = queueData.waitingUsers || {};
    const waitingArray = Object.values(waitingUsers);

    const rootRef = db.ref();

    if (!waitingArray.length) {
      // No one waiting: clear activeUser and reset theme/motion to idle state.
      const updates = {
        'queue/activeUser': 'none',
        'themeValues/current': {
          row1: 'none',
          row2: 'none',
          row3: 'none',
          sessionId: 'none',
          timestamp: ServerValue.TIMESTAMP,
        },
        'motionValues/current': {
          x: 0,
          y: 0,
          z: 0,
          sessionId: 'none',
          timestamp: ServerValue.TIMESTAMP,
        },
      };

      await rootRef.update(updates);
      logger.info('Cleared active user and reset theme/motion (queue empty)', {
        sessionId,
      });

      return;
    }

    // There are waiting users: pick the next one based on earliest joinedAt.
    const sortedUsers = waitingArray.sort((a, b) => {
      const aJoined = typeof a.joinedAt === 'number' ? a.joinedAt : Number.MAX_SAFE_INTEGER;
      const bJoined = typeof b.joinedAt === 'number' ? b.joinedAt : Number.MAX_SAFE_INTEGER;
      return aJoined - bJoined;
    });

    const nextUser = sortedUsers[0];

    if (!nextUser || !nextUser.sessionId) {
      logger.warn('Unable to determine next user from waitingUsers', {
        waitingCount: waitingArray.length,
      });

      // As a safety net, clear the active user and reset theme/motion.
      const fallbackUpdates = {
        'queue/activeUser': 'none',
        'themeValues/current': {
          row1: 'none',
          row2: 'none',
          row3: 'none',
          sessionId: 'none',
          timestamp: ServerValue.TIMESTAMP,
        },
        'motionValues/current': {
          x: 0,
          y: 0,
          z: 0,
          sessionId: 'none',
          timestamp: ServerValue.TIMESTAMP,
        },
      };

      await rootRef.update(fallbackUpdates);
      return;
    }

    const nextSessionId = nextUser.sessionId;
    const nowForNext = Date.now();
    const nextEndTime = nowForNext + 60 * 1000;

    // Look up this next user's theme and publish it as the current live theme
    const nextThemeSnap = await db.ref(`queue/themes/${nextSessionId}`).once('value');
    const nextTheme = nextThemeSnap.val();

    const updatePayload = {
      'queue/activeUser': {
        sessionId: nextSessionId,
        startTime: nowForNext,
        endTime: nextEndTime,
        remainingTime: 60,
      },
      // Remove from waitingUsers; we keep their theme under queue/themes
      [`queue/waitingUsers/${nextSessionId}`]: null,
      'queue/queueLength': Math.max(0, waitingArray.length - 1),
    };

    if (nextTheme && nextTheme.row1 && nextTheme.row2 && nextTheme.row3) {
      updatePayload['themeValues/current'] = {
        row1: nextTheme.row1,
        row2: nextTheme.row2,
        row3: nextTheme.row3,
        sessionId: nextSessionId,
        timestamp: ServerValue.TIMESTAMP,
      };
    } else {
      logger.warn('Next user has no stored theme; leaving themeValues/current unchanged', {
        sessionId: nextSessionId,
      });
    }

    await rootRef.update(updatePayload);

    logger.info('Advanced queue to next user from Cloud Function', {
      previousSessionId: sessionId,
      nextSessionId,
    });
  } catch (error) {
    logger.error('checkExpiredTurns failed', { error });
  }
});

/**
 * When a user joins the waiting queue, ensure that if there is no active user
 * we immediately promote the next waiting user to active. This keeps the
 * system responsive without relying on any client-side logic.
 */
export const ensureActiveUserForWaitingQueue = onValueWritten(
  'queue/waitingUsers/{sessionId}',
  async (_event) => {
    try {
      const queueSnap = await db.ref('queue').once('value');
      const queueData = queueSnap.val() || {};

      const activeUser = queueData.activeUser;

      // If someone is already active (object with sessionId), do nothing.
      if (
        activeUser &&
        activeUser !== 'none' &&
        typeof activeUser === 'object' &&
        activeUser.sessionId
      ) {
        return;
      }

      const waitingUsers = queueData.waitingUsers || {};
      const waitingArray = Object.values(waitingUsers);

      if (!waitingArray.length) {
        // Nobody is waiting; nothing to promote.
        return;
      }

      // Find earliest joined user. joinedAt is stored as a numeric timestamp
      // once the RTDB serverTimestamp resolves.
      const sortedUsers = waitingArray.sort((a, b) => {
        const aJoined = typeof a.joinedAt === 'number' ? a.joinedAt : Number.MAX_SAFE_INTEGER;
        const bJoined = typeof b.joinedAt === 'number' ? b.joinedAt : Number.MAX_SAFE_INTEGER;
        return aJoined - bJoined;
      });

      const nextUser = sortedUsers[0];
      if (!nextUser || !nextUser.sessionId) {
        logger.warn('ensureActiveUserForWaitingQueue: could not determine next user', {
          waitingCount: waitingArray.length,
        });
        return;
      }

      const nextSessionId = nextUser.sessionId;
      const now = Date.now();
      const endTime = now + 60 * 1000;

      // Look up this next user's theme and, if present, publish it to themeValues/current.
      const nextThemeSnap = await db.ref(`queue/themes/${nextSessionId}`).once('value');
      const nextTheme = nextThemeSnap.val();

      const rootRef = db.ref();
      const updatePayload = {
        'queue/activeUser': {
          sessionId: nextSessionId,
          startTime: now,
          endTime,
          remainingTime: 60,
        },
        // Remove from waitingUsers; keep their theme under queue/themes for session logging.
        [`queue/waitingUsers/${nextSessionId}`]: null,
        'queue/queueLength': Math.max(0, waitingArray.length - 1),
      };

      if (nextTheme && nextTheme.row1 && nextTheme.row2 && nextTheme.row3) {
        updatePayload['themeValues/current'] = {
          row1: nextTheme.row1,
          row2: nextTheme.row2,
          row3: nextTheme.row3,
          sessionId: nextSessionId,
          timestamp: ServerValue.TIMESTAMP,
        };
      } else {
        logger.warn('ensureActiveUserForWaitingQueue: next user has no stored theme', {
          sessionId: nextSessionId,
        });
      }

      await rootRef.update(updatePayload);

      logger.info('Promoted waiting user to active from RTDB trigger', {
        nextSessionId,
      });
    } catch (error) {
      logger.error('ensureActiveUserForWaitingQueue failed', { error });
    }
  }
);
