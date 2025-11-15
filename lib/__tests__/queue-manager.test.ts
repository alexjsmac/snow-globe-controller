import { FirebaseQueueManager } from '../queue-manager';

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
});
