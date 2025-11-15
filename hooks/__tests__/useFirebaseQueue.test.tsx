import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useFirebaseQueue } from '../useFirebaseQueue';
import { firebaseQueueManager } from '@/lib/queue-manager';

// Mock the queue manager
jest.mock('@/lib/queue-manager', () => ({
  firebaseQueueManager: {
    generateSessionId: jest.fn(() => 'test-session-id'),
    joinQueue: jest.fn(),
    storeThemeSelection: jest.fn(),
    listenToQueueState: jest.fn(),
    initializeQueue: jest.fn(),
    cleanup: jest.fn(),
  },
}));

// Test component that uses the hook
function TestComponent() {
  const { sessionId, isActive, queuePosition, queueLength, remainingTime, submitTheme } =
    useFirebaseQueue();

  return (
    <div>
      <div data-testid="session-id">{sessionId}</div>
      <div data-testid="is-active">{isActive.toString()}</div>
      <div data-testid="queue-position">{queuePosition}</div>
      <div data-testid="queue-length">{queueLength}</div>
      <div data-testid="remaining-time">{remainingTime}</div>
      <button onClick={() => submitTheme('green', 'stars', 'pulse')} data-testid="submit-button">
        Submit
      </button>
    </div>
  );
}

describe('useFirebaseQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should generate and store session ID', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('session-id')).toHaveTextContent('test-session-id');
    expect(localStorage.getItem('christmasThemeSessionId')).toBe('test-session-id');
  });

  it('should initialize with default values', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
    expect(screen.getByTestId('queue-position')).toHaveTextContent('-1');
    expect(screen.getByTestId('queue-length')).toHaveTextContent('0');
    expect(screen.getByTestId('remaining-time')).toHaveTextContent('0');
  });

  it('should submit theme selection', async () => {
    render(<TestComponent />);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(firebaseQueueManager.storeThemeSelection).toHaveBeenCalledWith(
        'test-session-id',
        'green',
        'stars',
        'pulse'
      );
      expect(firebaseQueueManager.joinQueue).toHaveBeenCalledWith('test-session-id');
    });
  });

  it('should reuse existing session ID from localStorage', () => {
    localStorage.setItem('christmasThemeSessionId', 'existing-session');

    render(<TestComponent />);

    expect(screen.getByTestId('session-id')).toHaveTextContent('existing-session');
  });

  it('should call initializeQueue on mount', () => {
    render(<TestComponent />);

    expect(firebaseQueueManager.initializeQueue).toHaveBeenCalled();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = render(<TestComponent />);

    unmount();

    expect(firebaseQueueManager.cleanup).toHaveBeenCalled();
  });
});
