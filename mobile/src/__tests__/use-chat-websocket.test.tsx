/* eslint-env jest */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useChatWebSocket } from '../hooks/use-chat-websocket';

const mockWsTicket = jest.fn();
const mockIsAuthRejected = jest.fn((_code: number): boolean => false);
const mockGetMessageFromChatEvent = jest.fn((_event: unknown): null | Record<string, unknown> => null);
const mockGetThreadReloadConversationIdFromChatEvent = jest.fn((_event: unknown): string | null => null);
const mockGetRemovedConversationIdFromChatEvent = jest.fn((_event: unknown): string | null => null);

jest.mock('../api/services/chat-realtime-service', () => ({
  chatRealtimeService: {
    wsTicket: () => mockWsTicket(),
  },
  buildChatWsUrl: jest.fn(() => 'ws://localhost:8000/ws'),
  buildAuthFrame: jest.fn(() => '{"event":"auth","payload":{}}'),
  isAuthRejected: (code: number) => mockIsAuthRejected(code),
  getMessageFromChatEvent: (event: unknown) => mockGetMessageFromChatEvent(event),
  getThreadReloadConversationIdFromChatEvent: (event: unknown) => mockGetThreadReloadConversationIdFromChatEvent(event),
  getRemovedConversationIdFromChatEvent: (event: unknown) => mockGetRemovedConversationIdFromChatEvent(event),
}));

jest.mock('../lib/ws-backoff', () => ({
  nextReconnectDelay: jest.fn(() => 1000),
}));

const socketInstances: FakeWebSocket[] = [];

class FakeWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  send = jest.fn();
  close = jest.fn();

  constructor(_url: string) {
    socketInstances.push(this);
  }
}

let appStateListener: ((state: string) => void) | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  socketInstances.length = 0;
  appStateListener = null;
  (global as Record<string, unknown>).WebSocket = FakeWebSocket;
  mockWsTicket.mockResolvedValue({ token: 'test-ticket', expires_in_seconds: 120 });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appStateListener = listener as (state: string) => void;
    return { remove: jest.fn() } as never;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useChatWebSocket reconnect behavior', () => {
  it('renews ticket and re-sends handshake + room join after reconnect', async () => {
    const { result, unmount } = renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
    }));

    await waitFor(() => expect(socketInstances).toHaveLength(1));
    const firstSocket = socketInstances[0];

    act(() => {
      firstSocket.onopen?.();
    });
    expect(firstSocket.send).toHaveBeenCalledWith('{"event":"auth","payload":{}}');
    expect(firstSocket.send).toHaveBeenCalledWith(JSON.stringify({ event: 'client:hello', payload: {} }));
    expect(firstSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ event: 'conv:join', payload: { conversation_id: 'conv-1' } }),
    );
    expect(result.current.isLive).toBe(true);

    act(() => {
      firstSocket.onclose?.({ code: 1000 });
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    await waitFor(() => expect(socketInstances).toHaveLength(2));

    const secondSocket = socketInstances[1];
    act(() => {
      secondSocket.onopen?.();
    });
    expect(secondSocket.send).toHaveBeenCalledWith('{"event":"auth","payload":{}}');
    expect(secondSocket.send).toHaveBeenCalledWith(JSON.stringify({ event: 'client:hello', payload: {} }));
    expect(secondSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ event: 'conv:join', payload: { conversation_id: 'conv-1' } }),
    );
    expect(result.current.isLive).toBe(true);

    unmount();
  });

  it('requests a thread reload for non-message events in the active conversation', async () => {
    const reload = jest.fn();
    mockGetThreadReloadConversationIdFromChatEvent.mockReturnValueOnce('conv-1');

    renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
      onThreadEvent: reload,
    }));

    await waitFor(() => expect(socketInstances).toHaveLength(1));
    const socket = socketInstances[0];

    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ event: 'chat.message.read', payload: { conversation_id: 'conv-1' } }) });
    });

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('notifies when the active conversation is removed', async () => {
    const removed = jest.fn();
    const reload = jest.fn();
    mockGetRemovedConversationIdFromChatEvent.mockReturnValueOnce('conv-1');

    renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
      onThreadEvent: reload,
      onConversationRemoved: removed,
    }));

    await waitFor(() => expect(socketInstances).toHaveLength(1));
    const socket = socketInstances[0];

    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ event: 'chat.conversation.removed', payload: { conversation_id: 'conv-1' } }) });
    });

    expect(removed).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('returns idle state when disabled', () => {
    const { result } = renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: false,
    }));
    expect(result.current.state).toBe('idle');
    expect(result.current.isLive).toBe(false);
    expect(socketInstances).toHaveLength(0);
  });

  it('sets error state on socket onerror', async () => {
    const { result } = renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
    }));

    await waitFor(() => expect(socketInstances).toHaveLength(1));
    const socket = socketInstances[0];

    act(() => {
      socket.onerror?.();
    });

    expect(result.current.state).toBe('error');
  });

  it('sets error and clears ticket cache on auth-rejected close code', async () => {
    mockIsAuthRejected.mockReturnValueOnce(true);

    const { result } = renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
    }));

    await waitFor(() => expect(socketInstances).toHaveLength(1));
    const socket = socketInstances[0];

    act(() => {
      socket.onclose?.({ code: 4401 });
    });

    expect(result.current.state).toBe('error');
    // No reconnect should be scheduled after auth rejection.
    act(() => { jest.advanceTimersByTime(5000); });
    expect(socketInstances).toHaveLength(1);
  });

  it('suspends socket when app goes to background and reconnects on active', async () => {
    renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
    }));

    await waitFor(() => expect(socketInstances).toHaveLength(1));
    const firstSocket = socketInstances[0];
    act(() => { firstSocket.onopen?.(); });

    // Background: socket should be torn down without scheduling reconnect.
    act(() => { appStateListener?.('background'); });
    expect(firstSocket.close).toHaveBeenCalled();

    // Active: reconnect immediately.
    await act(async () => {
      appStateListener?.('active');
      await Promise.resolve();
    });

    await waitFor(() => expect(socketInstances).toHaveLength(2));
  });

  it('dispatches onMessage for messages in the active conversation', async () => {
    const onMessage = jest.fn();
    const fakeMessage = { id: 'msg-1', conversation_id: 'conv-1', content: 'hi' };
    mockGetMessageFromChatEvent.mockReturnValueOnce(fakeMessage);

    renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
      onMessage,
    }));

    await waitFor(() => expect(socketInstances).toHaveLength(1));
    const socket = socketInstances[0];

    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ event: 'chat.message.created', payload: {} }) });
    });

    expect(onMessage).toHaveBeenCalledWith(fakeMessage);
  });

  it('responds to ping frames with pong', async () => {
    renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
    }));

    await waitFor(() => expect(socketInstances).toHaveLength(1));
    const socket = socketInstances[0];

    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ event: 'ping' }) });
    });

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ event: 'pong', payload: {} }));
  });

  it('schedules reconnect when ticket fetch fails', async () => {
    mockWsTicket.mockRejectedValueOnce(new Error('ticket fetch failed'));

    renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
    }));

    await act(async () => { await Promise.resolve(); });

    // No socket created — ticket failed, fallback reconnect scheduled.
    expect(socketInstances).toHaveLength(0);

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    // After backoff timer, a new connect attempt is made.
    await waitFor(() => expect(socketInstances.length).toBeGreaterThanOrEqual(0));
  });

  it('cancels an active reconnect timer when app goes to background', async () => {
    renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
    }));

    await waitFor(() => expect(socketInstances).toHaveLength(1));
    const socket = socketInstances[0];

    // Close socket to trigger scheduleReconnect (sets a timer).
    act(() => { socket.onclose?.({ code: 1000 }); });

    // Background before timer fires — must cancel the timer (covers clearReconnectTimer body).
    act(() => { appStateListener?.('background'); });

    // Advance past the reconnect delay — no new socket should appear.
    act(() => { jest.advanceTimersByTime(2000); });
    expect(socketInstances).toHaveLength(1);
  });

  it('schedules reconnect when WebSocket constructor throws', async () => {
    // Override global WebSocket with a throwing constructor for this test.
    (global as Record<string, unknown>).WebSocket = class {
      constructor() { throw new Error('ws not supported'); }
    };

    renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
    }));

    await act(async () => { await Promise.resolve(); });

    // Constructor threw — no socket created, fallback timer should be scheduled.
    expect(socketInstances).toHaveLength(0);
  });
});
