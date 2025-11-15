import { updateThemeSelection, resetThemeSelection } from '../theme-service';
import { ref, set } from 'firebase/database';

jest.mock('firebase/database');

describe('ThemeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateThemeSelection', () => {
    it('should update theme values with all parameters', async () => {
      const mockRef = jest.fn();
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      await updateThemeSelection('green', 'stars', 'pulse', 'test-session');

      expect(ref).toHaveBeenCalledWith(expect.anything(), 'themeValues/current');
      expect(set).toHaveBeenCalledWith(
        mockRef,
        expect.objectContaining({
          row1: 'green',
          row2: 'stars',
          row3: 'pulse',
          sessionId: 'test-session',
        })
      );
    });

    it('should include server timestamp', async () => {
      const mockRef = jest.fn();
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      await updateThemeSelection('red', 'lights', 'sparkle', 'session-123');

      expect(set).toHaveBeenCalledWith(
        mockRef,
        expect.objectContaining({
          timestamp: expect.anything(),
        })
      );
    });
  });

  describe('resetThemeSelection', () => {
    it('should reset all theme values to "none"', async () => {
      const mockRef = jest.fn();
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      await resetThemeSelection();

      expect(set).toHaveBeenCalledWith(
        mockRef,
        expect.objectContaining({
          row1: 'none',
          row2: 'none',
          row3: 'none',
          sessionId: 'none',
        })
      );
    });

    it('should include timestamp when resetting', async () => {
      const mockRef = jest.fn();
      (ref as jest.Mock).mockReturnValue(mockRef);
      (set as jest.Mock).mockResolvedValue(undefined);

      await resetThemeSelection();

      expect(set).toHaveBeenCalledWith(
        mockRef,
        expect.objectContaining({
          timestamp: expect.anything(),
        })
      );
    });
  });
});
