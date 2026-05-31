import { apiRequest, buildQuery } from '../client';
import type {
  ChatUserLookupResult,
  Conversation,
  DataResponse,
  Message,
  MessageContentType,
  MessageListResponse,
} from '../../../../shared/api-contracts';

let msgSeq = 0;

export interface ChatMessagesOptions {
  before?: string | null;
  limit?: number;
}

export interface ChatAttachmentInput {
  url: string;
  name: string;
  size: number;
  mime_type: string;
}

interface SendMessageOptions {
  attachments?: ChatAttachmentInput[];
  contentType?: MessageContentType;
}

function nextClientMessageId() {
  return `mobile-${Date.now()}-${++msgSeq}`;
}

function contentTypeForAttachment(attachment: ChatAttachmentInput): MessageContentType {
  return attachment.mime_type.toLowerCase().startsWith('image/') ? 'image' : 'file';
}

async function sendChatMessage(conversationId: string, content: string, options: SendMessageOptions = {}) {
  const response = await apiRequest<DataResponse<Message>>(`/v1/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    json: {
      content,
      content_type: options.contentType ?? 'text',
      client_message_id: nextClientMessageId(),
      attachments: options.attachments,
    },
  });
  return response.data;
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

  async createAiConversation(initialMessage?: string) {
    const response = await apiRequest<DataResponse<Conversation>>('/v1/conversations/ai', {
      method: 'POST',
      json: initialMessage ? { initial_message: initialMessage } : undefined,
    });
    return response.data;
  },

  async lookupUsers(query: string, limit = 10) {
    const response = await apiRequest<DataResponse<ChatUserLookupResult[]>>(`/v1/users/lookup${buildQuery({
      q: query.trim(),
      limit,
    })}`);
    return response.data;
  },

  async createDirectConversation(targetUserId: string) {
    const response = await apiRequest<DataResponse<Conversation>>('/v1/conversations/direct', {
      method: 'POST',
      json: { target_user_id: targetUserId },
    });
    return response.data;
  },

  async createGroupConversation(title: string, memberIds: string[]) {
    const response = await apiRequest<DataResponse<Conversation>>('/v1/conversations', {
      method: 'POST',
      json: { title, member_ids: memberIds },
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

  async sendMessage(conversationId: string, content: string, options: SendMessageOptions = {}) {
    return sendChatMessage(conversationId, content, options);
  },

  async sendAttachmentMessage(conversationId: string, attachment: ChatAttachmentInput, caption?: string | null) {
    const content = caption?.trim() || `Shared attachment: ${attachment.name}`;
    return sendChatMessage(conversationId, content, {
      attachments: [attachment],
      contentType: contentTypeForAttachment(attachment),
    });
  },

  async markRead(conversationId: string, lastReadMessageId: string) {
    return apiRequest<void>(`/v1/conversations/${encodeURIComponent(conversationId)}/read`, {
      method: 'POST',
      json: { last_read_message_id: lastReadMessageId },
    });
  },
};
