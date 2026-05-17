import { apiRequest } from '../client';
import type { Conversation, DataResponse, Message, MessageListResponse } from '../../../../shared/api-contracts';

let msgSeq = 0;

export const chatService = {
  async conversations() {
    const response = await apiRequest<{ data: Conversation[]; total: number }>('/v1/conversations');
    return response.data;
  },

  async conversation(id: string) {
    const response = await apiRequest<DataResponse<Conversation>>(`/v1/conversations/${id}`);
    return response.data;
  },

  async createAiConversation(initialMessage?: string) {
    const response = await apiRequest<DataResponse<Conversation>>('/v1/conversations/ai', {
      method: 'POST',
      json: initialMessage ? { initial_message: initialMessage } : undefined,
    });
    return response.data;
  },

  async messages(conversationId: string) {
    const response = await apiRequest<MessageListResponse>(`/v1/conversations/${conversationId}/messages?limit=50`);
    return response.data.slice().reverse();
  },

  async sendMessage(conversationId: string, content: string) {
    const response = await apiRequest<DataResponse<Message>>(`/v1/conversations/${conversationId}/messages`, {
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
