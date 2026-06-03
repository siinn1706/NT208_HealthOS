/* eslint-env jest */
import {
  buildChatWsUrl,
  chatRealtimeService,
  getMessageFromChatEvent,
  getRemovedConversationIdFromChatEvent,
  getThreadReloadConversationIdFromChatEvent,
} from '../api/services/chat-realtime-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  getCoreWsBaseUrl: jest.fn(() => 'ws://localhost:8000'),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('chatRealtimeService', () => {
  it('requests a short-lived websocket ticket', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { token: 'ticket-1', expires_in_seconds: 120 } });

    await expect(chatRealtimeService.wsTicket()).resolves.toEqual({ token: 'ticket-1', expires_in_seconds: 120 });

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/auth/ws-token');
  });

  it('builds /ws URL without token in query string', () => {
    // Token is now sent as a post-connect frame, never in the URL
    expect(buildChatWsUrl('wss://api.example.test/')).toBe('wss://api.example.test/ws');
    expect(buildChatWsUrl()).toMatch(/\/ws$/);
  });

  it('normalizes legacy and canonical message events', () => {
    const message = {
      id: 'msg-1',
      conversation_id: 'conv-1',
      content: 'Hello',
    };

    expect(getMessageFromChatEvent({ event: 'msg:new', payload: message })).toBe(message);
    expect(getMessageFromChatEvent({ event: 'chat.message.sent', payload: message })).toBe(message);
  });

  it('ignores malformed and non-message websocket frames', () => {
    expect(getMessageFromChatEvent({ event: 'ping', payload: {} })).toBeNull();
    expect(getMessageFromChatEvent({ event: 'chat.message.sent', payload: { id: 'msg-1' } })).toBeNull();
    expect(getMessageFromChatEvent({ event: 'chat.message.sent' })).toBeNull();
  });

  it('extracts conversation ids from non-message events that require a thread reload', () => {
    expect(getThreadReloadConversationIdFromChatEvent({
      event: 'chat.message.read',
      payload: { conversation_id: 'conv-1', last_read_message_id: 'msg-1' },
    })).toBe('conv-1');
    expect(getThreadReloadConversationIdFromChatEvent({
      event: 'ai:completed',
      payload: { conversation_id: 'conv-1', message_id: 'ai-msg-1' },
    })).toBe('conv-1');
    expect(getThreadReloadConversationIdFromChatEvent({
      event: 'chat.conversation.updated',
      payload: { conversation_id: 'conv-1' },
    })).toBe('conv-1');
    expect(getThreadReloadConversationIdFromChatEvent({
      event: 'typing',
      payload: { conversation_id: 'conv-1' },
    })).toBeNull();
  });

  it('extracts removed conversation events for thread exit handling', () => {
    expect(getRemovedConversationIdFromChatEvent({
      event: 'chat.conversation.removed',
      payload: { conversation_id: 'conv-1' },
    })).toBe('conv-1');
    expect(getRemovedConversationIdFromChatEvent({
      event: 'chat.conversation.updated',
      payload: { conversation_id: 'conv-1' },
    })).toBeNull();
  });
});
