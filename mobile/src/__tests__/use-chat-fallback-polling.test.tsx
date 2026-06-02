/* eslint-env jest */
import { act, renderHook } from '@testing-library/react-native';
import { useChatFallbackPolling } from '../hooks/use-chat-fallback-polling';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useChatFallbackPolling', () => {
  it('reloads immediately and then polls while websocket is in fallback', () => {
    const reload = jest.fn();

    renderHook(() => useChatFallbackPolling({
      realtimeState: 'fallback',
      reload,
      intervalMs: 5000,
    }));

    expect(reload).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('respects Retry-After header from 429 errors by suppressing the next tick', async () => {
    const reload = jest.fn().mockRejectedValueOnce({
      status: 429,
      headers: { get: (h: string) => h === 'Retry-After' ? '2' : null },
    }).mockResolvedValue(undefined);

    renderHook(() => useChatFallbackPolling({
      realtimeState: 'error',
      reload,
      intervalMs: 500,
    }));

    // First call fires on mount (returns 429, sets suppression for 2 s).
    expect(reload).toHaveBeenCalledTimes(1);

    // Advance 500 ms — still within suppression window, wrapped reload skips.
    act(() => { jest.advanceTimersByTime(500); });
    expect(reload).toHaveBeenCalledTimes(2);

    // Advance past the 2 s suppression window — next tick should call reload again.
    act(() => { jest.advanceTimersByTime(2500); });
    expect(reload).toHaveBeenCalledTimes(7);
  });

  it('does not poll while websocket is live or disabled', () => {
    const reload = jest.fn();

    renderHook(() => useChatFallbackPolling({
      realtimeState: 'connected',
      reload,
      intervalMs: 5000,
    }));
    renderHook(() => useChatFallbackPolling({
      enabled: false,
      realtimeState: 'fallback',
      reload,
      intervalMs: 5000,
    }));

    act(() => {
      jest.advanceTimersByTime(15000);
    });

    expect(reload).not.toHaveBeenCalled();
  });
});
