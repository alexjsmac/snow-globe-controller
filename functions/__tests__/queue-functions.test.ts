import { checkExpiredTurns, ensureActiveUserForWaitingQueue } from '../index.js';
import * as adminDatabase from 'firebase-admin/database';
import * as adminFirestore from 'firebase-admin/firestore';

// Mocks for Firebase Functions v2 wrappers so we get plain handlers we can call directly
jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: jest.fn(
    (_schedule: string, handler: (event: unknown) => Promise<unknown> | unknown) =>
      handler,
  ),
}));

jest.mock('firebase-functions/v2/database', () => ({
  onValueWritten: jest.fn(
    (_path: string, handler: (event: unknown) => Promise<unknown> | unknown) => handler,
  ),
}));

// Shared mocks for firebase-admin
// We define the jest.fn() instances inside the factory functions to avoid
// Jest's hoisting of jest.mock causing "Cannot access 'mockX' before
// initialization" errors. The factory returns these mocks so tests can
// import and configure them.

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(() => ({ app: 'test-app' })),
}));

jest.mock('firebase-admin/database', () => {
  const mockDbRef = jest.fn();

  return {
    getDatabase: jest.fn(() => ({
      ref: mockDbRef,
    })),
    ServerValue: {
      TIMESTAMP: 'SERVER_TIMESTAMP',
    },
    mockDbRef,
  };
});

jest.mock('firebase-admin/firestore', () => {
  const mockCollection = jest.fn();
  const mockAdd = jest.fn();

  return {
    getFirestore: jest.fn(() => ({
      collection: mockCollection,
    })),
    mockCollection,
    mockAdd,
  };
});

const { mockDbRef } = adminDatabase as (typeof adminDatabase & {
  mockDbRef: jest.Mock;
});
const { mockCollection, mockAdd } = adminFirestore as (typeof adminFirestore & {
  mockCollection: jest.Mock;
  mockAdd: jest.Mock;
});

jest.mock('firebase-functions/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const invokeCheckExpiredTurns = async (event: unknown) =>
  await (checkExpiredTurns as unknown as (e: unknown) => Promise<unknown> | unknown)(event);

const invokeEnsureActiveUserForWaitingQueue = async (event: unknown) =>
  await (
    ensureActiveUserForWaitingQueue as unknown as (e: unknown) => Promise<unknown> | unknown
  )(event);
describe('Cloud Function queue logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkExpiredTurns', () => {
    it('processes an expired active user and activates the next user in the queue', async () => {
      const now = Date.now();
      const expiredSessionId = 'active-session';
      const nextSessionId = 'next-session';

      const queueData = {
        activeUser: {
          sessionId: expiredSessionId,
          startTime: now - 70_000,
          endTime: now - 10_000,
          remainingTime: 0,
        },
        waitingUsers: {
          [nextSessionId]: {
            sessionId: nextSessionId,
            joinedAt: now - 30_000,
          },
        },
        queueLength: 2,
      };

      const queueRef = {
        once: jest.fn().mockResolvedValue({
          val: () => queueData,
        }),
      };

      const expiredTheme = {
        row1: 'red',
        row2: 'snowflakes',
        row3: 'twinkle',
        submittedAt: now - 80_000,
      };

      const expiredThemeRef = {
        once: jest.fn().mockResolvedValue({
          val: () => expiredTheme,
        }),
        remove: jest.fn().mockResolvedValue(undefined),
      };

      const nextTheme = {
        row1: 'green',
        row2: 'stripes',
        row3: 'pulse',
      };

      const nextThemeRef = {
        once: jest.fn().mockResolvedValue({
          val: () => nextTheme,
        }),
      };

      const rootUpdate = jest.fn().mockResolvedValue(undefined);
      const rootRef = { update: rootUpdate };

      mockDbRef.mockImplementation((path?: string) => {
        switch (path) {
          case 'queue':
            return queueRef;
          case `queue/themes/${expiredSessionId}`:
            return expiredThemeRef;
          case `queue/themes/${nextSessionId}`:
            return nextThemeRef;
          case undefined:
            return rootRef;
          default:
            throw new Error(`Unexpected ref path: ${path}`);
        }
      });

      mockCollection.mockReturnValue({ add: mockAdd });

      await invokeCheckExpiredTurns({});

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: expiredSessionId,
          duration: 60,
          theme: {
            row1: expiredTheme.row1,
            row2: expiredTheme.row2,
            row3: expiredTheme.row3,
          },
        })
      );

      expect(expiredThemeRef.remove).toHaveBeenCalled();

      expect(rootUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          'queue/activeUser': expect.objectContaining({
            sessionId: nextSessionId,
            remainingTime: 60,
          }),
          [`queue/waitingUsers/${nextSessionId}`]: null,
          'queue/queueLength': 0,
          'themeValues/current': expect.objectContaining({
            row1: nextTheme.row1,
            row2: nextTheme.row2,
            row3: nextTheme.row3,
            sessionId: nextSessionId,
          }),
        })
      );
    });

    it('handles an expired active user with no waiting users by setting the system to idle', async () => {
      const now = Date.now();
      const expiredSessionId = 'lonely-session';

      const queueData = {
        activeUser: {
          sessionId: expiredSessionId,
          startTime: now - 70_000,
          endTime: now - 10_000,
          remainingTime: 0,
        },
        waitingUsers: {},
        queueLength: 1,
      };

      const queueRef = {
        once: jest.fn().mockResolvedValue({
          val: () => queueData,
        }),
      };

      const expiredTheme = {
        row1: 'red',
        row2: 'snowflakes',
        row3: 'twinkle',
        submittedAt: now - 80_000,
      };

      const expiredThemeRef = {
        once: jest.fn().mockResolvedValue({
          val: () => expiredTheme,
        }),
        remove: jest.fn().mockResolvedValue(undefined),
      };

      const rootUpdate = jest.fn().mockResolvedValue(undefined);
      const rootRef = { update: rootUpdate };

      mockDbRef.mockImplementation((path?: string) => {
        switch (path) {
          case 'queue':
            return queueRef;
          case `queue/themes/${expiredSessionId}`:
            return expiredThemeRef;
          case undefined:
            return rootRef;
          default:
            throw new Error(`Unexpected ref path: ${path}`);
        }
      });

      mockCollection.mockReturnValue({ add: mockAdd });

      await invokeCheckExpiredTurns({});

      expect(expiredThemeRef.remove).toHaveBeenCalled();

      expect(rootUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          'queue/activeUser': 'none',
          'themeValues/current': expect.objectContaining({
            row1: 'none',
            row2: 'none',
            row3: 'none',
            sessionId: 'none',
          }),
          'motionValues/current': expect.objectContaining({
            x: 0,
            y: 0,
            z: 0,
            sessionId: 'none',
          }),
        })
      );
    });
  });

  describe('ensureActiveUserForWaitingQueue', () => {
    it('promotes a new user to active if no one is currently active', async () => {
      const now = Date.now();
      const nextSessionId = 'waiting-user';

      const queueData = {
        activeUser: 'none',
        waitingUsers: {
          [nextSessionId]: {
            sessionId: nextSessionId,
            joinedAt: now - 30_000,
          },
        },
        queueLength: 1,
      };

      const queueRef = {
        once: jest.fn().mockResolvedValue({
          val: () => queueData,
        }),
      };

      const nextTheme = {
        row1: 'green',
        row2: 'stripes',
        row3: 'pulse',
      };

      const nextThemeRef = {
        once: jest.fn().mockResolvedValue({
          val: () => nextTheme,
        }),
      };

      const rootUpdate = jest.fn().mockResolvedValue(undefined);
      const rootRef = { update: rootUpdate };

      mockDbRef.mockImplementation((path?: string) => {
        switch (path) {
          case 'queue':
            return queueRef;
          case `queue/themes/${nextSessionId}`:
            return nextThemeRef;
          case undefined:
            return rootRef;
          default:
            throw new Error(`Unexpected ref path: ${path}`);
        }
      });

      await invokeEnsureActiveUserForWaitingQueue({});

      expect(rootUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          'queue/activeUser': expect.objectContaining({
            sessionId: nextSessionId,
            remainingTime: 60,
          }),
          [`queue/waitingUsers/${nextSessionId}`]: null,
          'queue/queueLength': 0,
          'themeValues/current': expect.objectContaining({
            row1: nextTheme.row1,
            row2: nextTheme.row2,
            row3: nextTheme.row3,
            sessionId: nextSessionId,
          }),
        })
      );
    });

    it('does not promote a new user if an active user already exists', async () => {
      const now = Date.now();

      const queueData = {
        activeUser: {
          sessionId: 'already-active',
          startTime: now - 10_000,
          endTime: now + 50_000,
          remainingTime: 50,
        },
        waitingUsers: {
          'waiting-user': {
            sessionId: 'waiting-user',
            joinedAt: now - 5_000,
          },
        },
        queueLength: 2,
      };

      const queueRef = {
        once: jest.fn().mockResolvedValue({
          val: () => queueData,
        }),
      };

      const rootUpdate = jest.fn().mockResolvedValue(undefined);
      const rootRef = { update: rootUpdate };

      mockDbRef.mockImplementation((path?: string) => {
        switch (path) {
          case 'queue':
            return queueRef;
          case undefined:
            return rootRef;
          default:
            throw new Error(`Unexpected ref path: ${path}`);
        }
      });

      await invokeEnsureActiveUserForWaitingQueue({});

      expect(rootUpdate).not.toHaveBeenCalled();
    });
  });
});
