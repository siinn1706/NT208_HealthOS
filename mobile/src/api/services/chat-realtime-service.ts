import { ApiError, apiRequest, getWebSocketBaseUrl } from '../client';
import type { DataResponse, Message } from '../../../../shared/api-contracts';
import { buildAuthFrame, isAuthRejected } from '../../lib/ws-auth-protocol';

export { buildAuthFrame, isAuthRejected };

export interface WsTicket {
  token: string;
  expires_in_seconds: number;
}

export interface ChatWsEvent {
  event: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

/**
 * AI lifecycle event — carries the `client_message_id` that was sent in the
 * original POST so the consumer can correlate against its optimistic map
 * even when the event arrives before the optimistic row is committed.
 */
export interface AiLifecycleEvent {
  event: 'ai:started' | 'ai:completed' | 'chat.message.ai_started' | 'chat.message.ai_completed';
  conversation_id: string;
  message_id: string | null;
  /** Echoed from the POST body — used for client-side dedup. */
  client_message_id: string | null;
}

/**
 * Builds the WS URL without the auth ticket in the query string.
 * The ticket is sent as the first post-connect frame via buildAuthFrame()
 * to prevent it from appearing in proxy logs and browser history.
 */
export function buildChatWsUrl(baseUrl = getWebSocketBaseUrl()) {
  return `${baseUrl.replace(/\/+$/, '')}/ws`;
}

export function getMessageFromChatEvent(event: ChatWsEvent): Message | null {
  if (!['msg:new', 'chat.message.sent'].includes(event.event)) return null;
  const payload = event.payload;
  if (!payload || typeof payload !== 'object') return null;
  if (typeof payload.id !== 'string' || typeof payload.conversation_id !== 'string') return null;
  return payload as unknown as Message;
}

const THREAD_RELOAD_EVENTS = new Set([
  'msg:edit',
  'msg:delete',
  'msg:react',
  'msg:read',
  'msg:pinned',
  'msg:unpinned',
  'ai:started',
  'ai:completed',
  'chat.message.edited',
  'chat.message.recalled',
  'chat.message.reacted',
  'chat.message.read',
  'chat.message.pinned',
  'chat.message.unpinned',
  'chat.message.ai_started',
  'chat.message.ai_completed',
  'chat.conversation.updated',
  'conversation.updated',
]);

export function getThreadReloadConversationIdFromChatEvent(event: ChatWsEvent): string | null {
  if (!THREAD_RELOAD_EVENTS.has(event.event)) return null;
  const payload = event.payload;
  if (!payload || typeof payload !== 'object') return null;
  return typeof payload.conversation_id === 'string' ? payload.conversation_id : null;
}

export function getRemovedConversationIdFromChatEvent(event: ChatWsEvent): string | null {
  if (!['chat.conversation.removed', 'conversation.removed'].includes(event.event)) return null;
  const payload = event.payload;
  if (!payload || typeof payload !== 'object') return null;
  return typeof payload.conversation_id === 'string' ? payload.conversation_id : null;
}

/** AI lifecycle events that carry client_message_id for deduplification. */
const AI_LIFECYCLE_EVENTS = new Set([
  'ai:started',
  'ai:completed',
  'chat.message.ai_started',
  'chat.message.ai_completed',
]);

/**
 * Extract AI lifecycle event data including client_message_id.
 * Returns null for non-AI-lifecycle frames.
 */
export function getAiLifecycleEventFromChatEvent(event: ChatWsEvent): AiLifecycleEvent | null {
  if (!AI_LIFECYCLE_EVENTS.has(event.event)) return null;
  const payload = event.payload;
  if (!payload || typeof payload !== 'object') return null;
  const conversationId = typeof payload.conversation_id === 'string' ? payload.conversation_id : null;
  if (!conversationId) return null;
  return {
    event: event.event as AiLifecycleEvent['event'],
    conversation_id: conversationId,
    message_id: typeof payload.message_id === 'string' ? payload.message_id : null,
    client_message_id: typeof payload.client_message_id === 'string' ? payload.client_message_id : null,
  };
}

export const chatRealtimeService = {
  async wsTicket() {
    const response = await apiRequest<DataResponse<WsTicket>>('/api/v1/auth/ws-token');
    if (!response?.data?.token) {
      throw new ApiError('Invalid ws-token response.', 0, 'WS_TICKET_MALFORMED');
    }
    return response.data;
  },

  async openSocket() {
    const ticket = await this.wsTicket();
    const ws = new WebSocket(buildChatWsUrl());
    // Auth ticket sent as first post-connect frame — never in URL
    ws.addEventListener('open', () => ws.send(buildAuthFrame(ticket.token)));
    return ws;
  },
};
