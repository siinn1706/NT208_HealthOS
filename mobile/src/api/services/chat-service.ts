import { apiRequest, buildQuery } from '../client';
import type { Conversation, DataResponse, Message, MessageListResponse } from '../../../../shared/api-contracts';

let msgSeq = 0;

export interface ChatMessagesOptions {
  before?: string | null;
  limit?: number;
}

export const chatService = {
  async conversations() {
    const response = await apiRequest<{ data: Conversation[]; total: number }>('/v1/conversations');
    return response.data;
  },

  async conversation(id: string) {
    const response = await apiRequest<DataResponse<Conversation>>(`/v1/conversations/${encodeURIComponent(id)}`);
    return response.data;
  },

  /** Pending conversation requests awaiting this user's acceptance (stranger DMs + group invites). */
  async pendingConversations() {
    const response = await apiRequest<{ data: Conversation[]; total: number }>('/v1/conversations/pending');
    return response.data;
  },

  /** Accept a pending conversation request (becomes an accepted member). */
  async acceptConversation(id: string) {
    await apiRequest(`/v1/conversations/${encodeURIComponent(id)}/accept`, { method: 'POST' });
  },

  /** Reject a pending conversation request. */
  async rejectConversation(id: string) {
    await apiRequest(`/v1/conversations/${encodeURIComponent(id)}/reject`, { method: 'POST' });
  },

  async createAiConversation(initialMessage?: string) {
    const response = await apiRequest<DataResponse<Conversation>>('/v1/conversations/ai', {
      method: 'POST',
      json: initialMessage ? { initial_message: initialMessage } : undefined,
    });
    return response.data;
  },

  async messages(conversationId: string, options: ChatMessagesOptions = {}) {
    const response = await apiRequest<MessageListResponse>(
      `/v1/conversations/${encodeURIComponent(conversationId)}/messages${buildQuery({
        limit: options.limit ?? 50,
        before: options.before,
      })}`,
    );
    return {
      ...response,
      data: response.data.slice().reverse(),
    };
  },

  async sendMessage(conversationId: string, content: string) {
    const response = await apiRequest<DataResponse<Message>>(`/v1/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      json: {
        content,
        content_type: 'text',
        client_message_id: `mobile-${Date.now()}-${++msgSeq}`,
      },
    });
    return response.data;
  },
};
