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
