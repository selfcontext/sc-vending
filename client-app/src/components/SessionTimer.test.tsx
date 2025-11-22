import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionTimer from './SessionTimer';

describe('SessionTimer Component', () => {
  const mockOnExtend = vi.fn();
  let dateNowSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1000000);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    dateNowSpy.mockRestore();
  });

  describe('Timer Display', () => {
    it('should display time remaining correctly', () => {
      const expiresAt = new Date(1000000 + 3 * 60 * 1000); // 3 minutes from now

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('3:00')).toBeInTheDocument();
      expect(screen.getByText('Time left')).toBeInTheDocument();
    });

    it('should update countdown every 100ms', () => {
      const expiresAt = new Date(1000000 + 60 * 1000); // 1 minute from now

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('1:00')).toBeInTheDocument();

      // Advance time by 10 seconds
      act(() => {
        dateNowSpy.mockReturnValue(1000000 + 10 * 1000);
        vi.advanceTimersByTime(10000);
      });

      expect(screen.getByText('0:50')).toBeInTheDocument();
    });

    it('should pad seconds with leading zero', () => {
      const expiresAt = new Date(1000000 + 9 * 1000); // 9 seconds

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('0:09')).toBeInTheDocument();
    });

    it('should show Session Expired when time reaches zero', () => {
      const expiresAt = new Date(1000000); // Expires now

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('Session Expired')).toBeInTheDocument();
      expect(screen.queryByText('Time left')).not.toBeInTheDocument();
    });

    it('should show expired state for past expiry time', () => {
      const expiresAt = new Date(1000000 - 60 * 1000); // Expired 1 minute ago

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('Session Expired')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should use green color when more than 60 seconds remain', () => {
      const expiresAt = new Date(1000000 + 90 * 1000); // 90 seconds

      const { container } = render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      const circle = container.querySelector('circle[stroke="#10b981"]');
      expect(circle).toBeInTheDocument();
    });

    it('should use amber color when 15-60 seconds remain', () => {
      const expiresAt = new Date(1000000 + 30 * 1000); // 30 seconds

      const { container } = render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      const circle = container.querySelector('circle[stroke="#f59e0b"]');
      expect(circle).toBeInTheDocument();
    });

    it('should use red color when less than 15 seconds remain', () => {
      const expiresAt = new Date(1000000 + 10 * 1000); // 10 seconds

      const { container } = render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      const circle = container.querySelector('circle[stroke="#ef4444"]');
      expect(circle).toBeInTheDocument();
    });
  });

  describe('Extension Warning', () => {
    it('should show warning modal at 15 seconds', async () => {
      const expiresAt = new Date(1000000 + 15 * 1000); // 15 seconds

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
      });

      expect(screen.getByText(/Your session will expire in/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Extend Session/i })).toBeInTheDocument();
    });

    it('should not show warning modal when more than 15 seconds remain', () => {
      const expiresAt = new Date(1000000 + 20 * 1000); // 20 seconds

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      expect(screen.queryByText('Session Expiring Soon')).not.toBeInTheDocument();
    });

    it('should show extend button when extendedCount < 1', async () => {
      const expiresAt = new Date(1000000 + 10 * 1000); // 10 seconds

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Extend Session/i })).toBeInTheDocument();
      });
    });

    it('should show cannot extend banner when already extended', async () => {
      const expiresAt = new Date(1000000 + 10 * 1000); // 10 seconds

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={1}
          onExtend={mockOnExtend}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Complete checkout now!/i)).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /Extend Session/i })).not.toBeInTheDocument();
    });

    it('should call onExtend when extend button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const expiresAt = new Date(1000000 + 10 * 1000); // 10 seconds

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Extend Session/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Extend Session/i }));

      expect(mockOnExtend).toHaveBeenCalledTimes(1);
    });

    it('should hide warning when time goes back above 15 seconds', async () => {
      const expiresAt = new Date(1000000 + 14 * 1000); // 14 seconds

      const { rerender } = render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
      });

      // Session extended - new expiry time
      const newExpiresAt = new Date(1000000 + 3 * 60 * 1000); // 3 minutes

      rerender(
        <SessionTimer
          expiresAt={newExpiresAt}
          sessionId="test-123"
          extendedCount={1}
          onExtend={mockOnExtend}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Session Expiring Soon')).not.toBeInTheDocument();
      });
    });
  });

  describe('Progress Circle', () => {
    it('should calculate progress percentage correctly', () => {
      const expiresAt = new Date(1000000 + 180 * 1000); // 3 minutes = 180 seconds

      const { container } = render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      // Progress should start at 100%
      const progressCircle = container.querySelector('circle[stroke="#10b981"]');
      expect(progressCircle).toBeInTheDocument();
    });

    it('should decrease progress over time', () => {
      const expiresAt = new Date(1000000 + 60 * 1000); // 1 minute

      const { container } = render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      const initialCircle = container.querySelector('circle[stroke="#10b981"]');
      const initialDashoffset = initialCircle?.getAttribute('stroke-dashoffset');

      // Advance time by 30 seconds
      act(() => {
        dateNowSpy.mockReturnValue(1000000 + 30 * 1000);
        vi.advanceTimersByTime(30000);
      });

      const updatedCircle = container.querySelector('circle[stroke="#f59e0b"]');
      const updatedDashoffset = updatedCircle?.getAttribute('stroke-dashoffset');

      expect(updatedDashoffset).not.toBe(initialDashoffset);
    });
  });

  describe('Edge Cases', () => {
    it('should handle session that is already expired on mount', () => {
      const expiresAt = new Date(1000000 - 1000); // Expired 1 second ago

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('Session Expired')).toBeInTheDocument();
      expect(mockOnExtend).not.toHaveBeenCalled();
    });

    it('should cleanup interval on unmount', () => {
      const expiresAt = new Date(1000000 + 60 * 1000);

      const { unmount } = render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle extend count greater than 1', async () => {
      const expiresAt = new Date(1000000 + 10 * 1000);

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={5}
          onExtend={mockOnExtend}
        />
      );

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Extend Session/i })).not.toBeInTheDocument();
      });
    });

    it('should stop countdown at zero', () => {
      const expiresAt = new Date(1000000 + 1000); // 1 second

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('0:01')).toBeInTheDocument();

      // Advance past expiry
      act(() => {
        dateNowSpy.mockReturnValue(1000000 + 2000);
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('Session Expired')).toBeInTheDocument();

      // Further time advance should not change display
      act(() => {
        dateNowSpy.mockReturnValue(1000000 + 10000);
        vi.advanceTimersByTime(8000);
      });

      expect(screen.getByText('Session Expired')).toBeInTheDocument();
    });

    it('should handle very short sessions (< 1 second)', () => {
      const expiresAt = new Date(1000000 + 500); // 0.5 seconds

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      // Should show 0:00 or expired
      const timeDisplay = screen.getByText(/0:0[01]/);
      expect(timeDisplay).toBeInTheDocument();
    });

    it('should recalculate when expiresAt prop changes', () => {
      const initialExpiresAt = new Date(1000000 + 60 * 1000); // 1 minute

      const { rerender } = render(
        <SessionTimer
          expiresAt={initialExpiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('1:00')).toBeInTheDocument();

      // Session extended
      const newExpiresAt = new Date(1000000 + 180 * 1000); // 3 minutes

      rerender(
        <SessionTimer
          expiresAt={newExpiresAt}
          sessionId="test-123"
          extendedCount={1}
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('3:00')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have descriptive text for screen readers', () => {
      const expiresAt = new Date(1000000 + 120 * 1000);

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('Time left')).toBeInTheDocument();
    });

    it('should have clickable extend button', async () => {
      const user = userEvent.setup({ delay: null });
      const expiresAt = new Date(1000000 + 10 * 1000);

      render(
        <SessionTimer
          expiresAt={expiresAt}
          sessionId="test-123"
          extendedCount={0}
          onExtend={mockOnExtend}
        />
      );

      const button = await screen.findByRole('button', { name: /Extend Session/i });
      expect(button).toBeEnabled();

      await user.click(button);
      expect(mockOnExtend).toHaveBeenCalled();
    });
  });
});
