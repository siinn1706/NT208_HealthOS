/* eslint-env jest */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useChatWebSocket } from '../hooks/use-chat-websocket';

const mockOpenSocket = jest.fn();
const mockGetMessageFromChatEvent = jest.fn((_event: unknown): null => null);
const mockGetThreadReloadConversationIdFromChatEvent = jest.fn((_event: unknown): string | null => null);
const mockGetRemovedConversationIdFromChatEvent = jest.fn((_event: unknown): string | null => null);

jest.mock('../api/services/chat-realtime-service', () => ({
  chatRealtimeService: {
    openSocket: () => mockOpenSocket(),
  },
  getMessageFromChatEvent: (event: unknown) => mockGetMessageFromChatEvent(event),
  getThreadReloadConversationIdFromChatEvent: (event: unknown) => mockGetThreadReloadConversationIdFromChatEvent(event),
  getRemovedConversationIdFromChatEvent: (event: unknown) => mockGetRemovedConversationIdFromChatEvent(event),
}));

class FakeWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  send = jest.fn();
  close = jest.fn();
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useChatWebSocket reconnect behavior', () => {
  it('renews ticket/openSocket and re-sends handshake + room join after reconnect', async () => {
    const firstSocket = new FakeWebSocket();
    const secondSocket = new FakeWebSocket();
    mockOpenSocket
      .mockResolvedValueOnce(firstSocket as unknown as WebSocket)
      .mockResolvedValueOnce(secondSocket as unknown as WebSocket);

    const { result, unmount } = renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
    }));

    await waitFor(() => expect(mockOpenSocket).toHaveBeenCalledTimes(1));

    act(() => {
      firstSocket.onopen?.();
    });
    expect(firstSocket.send).toHaveBeenCalledWith(JSON.stringify({ event: 'client:hello', payload: {} }));
    expect(firstSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ event: 'conv:join', payload: { conversation_id: 'conv-1' } }),
    );
    expect(result.current.isLive).toBe(true);

    act(() => {
      firstSocket.onclose?.();
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    await waitFor(() => expect(mockOpenSocket).toHaveBeenCalledTimes(2));

    act(() => {
      secondSocket.onopen?.();
    });
    expect(secondSocket.send).toHaveBeenCalledWith(JSON.stringify({ event: 'client:hello', payload: {} }));
    expect(secondSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ event: 'conv:join', payload: { conversation_id: 'conv-1' } }),
    );
    expect(result.current.isLive).toBe(true);

    unmount();
  });

  it('requests a thread reload for non-message events in the active conversation', async () => {
    const socket = new FakeWebSocket();
    const reload = jest.fn();
    mockOpenSocket.mockResolvedValueOnce(socket as unknown as WebSocket);
    mockGetThreadReloadConversationIdFromChatEvent.mockReturnValueOnce('conv-1');

    renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
      onThreadEvent: reload,
    }));

    await waitFor(() => expect(mockOpenSocket).toHaveBeenCalledTimes(1));
    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ event: 'chat.message.read', payload: { conversation_id: 'conv-1' } }) });
    });

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('notifies when the active conversation is removed', async () => {
    const socket = new FakeWebSocket();
    const removed = jest.fn();
    const reload = jest.fn();
    mockOpenSocket.mockResolvedValueOnce(socket as unknown as WebSocket);
    mockGetRemovedConversationIdFromChatEvent.mockReturnValueOnce('conv-1');

    renderHook(() => useChatWebSocket({
      conversationId: 'conv-1',
      enabled: true,
      onThreadEvent: reload,
      onConversationRemoved: removed,
    }));

    await waitFor(() => expect(mockOpenSocket).toHaveBeenCalledTimes(1));
    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ event: 'chat.conversation.removed', payload: { conversation_id: 'conv-1' } }) });
    });

    expect(removed).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });
});
