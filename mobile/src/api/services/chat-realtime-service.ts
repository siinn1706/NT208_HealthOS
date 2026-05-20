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
