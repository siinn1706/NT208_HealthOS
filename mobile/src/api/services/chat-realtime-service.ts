import { apiRequest, getCoreWsBaseUrl } from '../client';
import type { DataResponse, Message } from '../../../../shared/api-contracts';

export interface WsTicket {
  ws_ticket: string;
  expires_in_seconds: number;
}

export interface ChatWsEvent {
  event: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export function buildChatWsUrl(ticket: string, baseUrl = getCoreWsBaseUrl()) {
  return `${baseUrl.replace(/\/+$/, '')}/ws?token=${encodeURIComponent(ticket)}`;
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

export const chatRealtimeService = {
  async wsTicket() {
    const response = await apiRequest<DataResponse<WsTicket>>('/v1/auth/ws-ticket');
    return response.data;
  },

  async openSocket() {
    const ticket = await this.wsTicket();
    return new WebSocket(buildChatWsUrl(ticket.ws_ticket));
  },
};
