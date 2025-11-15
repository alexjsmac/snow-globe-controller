import { saveThemeSession } from '../session-service';
import { collection, addDoc } from 'firebase/firestore';

jest.mock('firebase/firestore');

describe('SessionService', () => {
  const mockCollectionRef = { type: 'collection' };

  beforeEach(() => {
    jest.clearAllMocks();
    (collection as jest.Mock).mockReturnValue(mockCollectionRef);
  });

  describe('saveThemeSession', () => {
    it('should save complete session data to Firestore', async () => {
      (addDoc as jest.Mock).mockResolvedValue({ id: 'test-doc-id' });

      const sessionData = {
        sessionId: 'test-session',
        startTime: 1000000,
        endTime: 1060000,
        duration: 60,
        queueJoinTime: 999000,
        queueWaitTime: 1,
        theme: {
          row1: 'green',
          row2: 'stars',
          row3: 'pulse',
        },
      };

      await saveThemeSession(sessionData);

      expect(collection).toHaveBeenCalledWith(expect.anything(), 'sessions');
      expect(addDoc).toHaveBeenCalledWith(
        mockCollectionRef,
        expect.objectContaining({
          sessionId: 'test-session',
          startTime: 1000000,
          endTime: 1060000,
          duration: 60,
          theme: {
            row1: 'green',
            row2: 'stars',
            row3: 'pulse',
          },
        })
      );
    });

    it('should include createdAt timestamp', async () => {
      (addDoc as jest.Mock).mockResolvedValue({ id: 'test-doc-id' });

      const sessionData = {
        sessionId: 'test-session',
        startTime: 1000000,
        endTime: 1060000,
        duration: 60,
        queueJoinTime: 999000,
        queueWaitTime: 1,
        theme: {
          row1: 'red',
          row2: 'lights',
          row3: 'sparkle',
        },
      };

      await saveThemeSession(sessionData);

      expect(addDoc).toHaveBeenCalledWith(
        mockCollectionRef,
        expect.objectContaining({
          createdAt: 1060000,
        })
      );
    });

    it('should handle Firestore errors', async () => {
      const error = new Error('Firestore error');
      (addDoc as jest.Mock).mockRejectedValue(error);

      const sessionData = {
        sessionId: 'test-session',
        startTime: 1000000,
        endTime: 1060000,
        duration: 60,
        queueJoinTime: 999000,
        queueWaitTime: 1,
        theme: {
          row1: 'gold',
          row2: 'snowflakes',
          row3: 'wave',
        },
      };

      await expect(saveThemeSession(sessionData)).rejects.toThrow('Firestore error');
    });
  });
});
