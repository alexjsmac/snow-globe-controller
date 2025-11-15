import { FirebaseQueueManager } from '../queue-manager';
import { ref, set, remove, onValue } from 'firebase/database';

// Mock Firebase functions
jest.mock('firebase/database');

describe('FirebaseQueueManager', () => {
  let queueManager: FirebaseQueueManager;

  beforeEach(() => {
    jest.clearAllMocks();
    queueManager = new FirebaseQueueManager();
  });

  describe('generateSessionId', () => {
    it('should generate a valid UUID', () => {
      const sessionId = queueManager.generateSessionId();
      expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate unique session IDs', () => {
      const id1 = queueManager.generateSessionId();
      const id2 = queueManager.generateSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('storeThemeSelection', () => {
    it('should store theme selection with all values', async () => {
      const mockRef = jest.fn();
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      await queueManager.storeThemeSelection('test-session', 'green', 'stars', 'pulse');

      expect(ref).toHaveBeenCalledWith(expect.anything(), 'queue/themes/test-session');
      expect(set).toHaveBeenCalledWith(
        mockRef,
        expect.objectContaining({
          row1: 'green',
          row2: 'stars',
          row3: 'pulse',
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Firebase error');
      (set as jest.Mock).mockRejectedValue(error);

      await expect(
        queueManager.storeThemeSelection('test-session', 'green', 'stars', 'pulse')
      ).rejects.toThrow('Firebase error');
    });
  });

  describe('joinQueue', () => {
    it('should add user to waiting queue', async () => {
      const mockRef = jest.fn();
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      await queueManager.joinQueue('test-session');

      expect(ref).toHaveBeenCalledWith(expect.anything(), 'queue/waitingUsers/test-session');
      expect(set).toHaveBeenCalledWith(
        mockRef,
        expect.objectContaining({
          sessionId: 'test-session',
        })
      );
    });
  });

  describe('leaveQueue', () => {
    it('should remove user from waiting queue', async () => {
      const mockRef = jest.fn();
      (ref as jest.Mock).mockReturnValue(mockRef);
      (remove as jest.Mock).mockResolvedValue(undefined);

      await queueManager.leaveQueue('test-session');

      expect(remove).toHaveBeenCalledWith(mockRef);
    });

    it('should also remove theme selection', async () => {
      (remove as jest.Mock).mockResolvedValue(undefined);

      await queueManager.leaveQueue('test-session');

      // Should be called twice: once for user, once for theme
      expect(remove).toHaveBeenCalledTimes(2);
    });
  });

  describe('listenToQueueState', () => {
    it('should set up Firebase listener', () => {
      const callback = jest.fn();

      queueManager.listenToQueueState(callback);

      expect(onValue).toHaveBeenCalled();
    });

    it('should calculate waiting user positions', () => {
      const callback = jest.fn();
      const mockSnapshot = {
        val: () => ({
          activeUser: null,
          waitingUsers: {
            user1: { sessionId: 'user1', joinedAt: 1000 },
            user2: { sessionId: 'user2', joinedAt: 2000 },
            user3: { sessionId: 'user3', joinedAt: 1500 },
          },
          queueLength: 3,
        }),
      };

      (onValue as jest.Mock).mockImplementation((_ref, cb) => {
        cb(mockSnapshot);
      });

      queueManager.listenToQueueState(callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          waitingUsers: expect.objectContaining({
            user1: expect.objectContaining({ position: 1 }),
            user2: expect.objectContaining({ position: 3 }),
            user3: expect.objectContaining({ position: 2 }),
          }),
        })
      );
    });
  });
});
