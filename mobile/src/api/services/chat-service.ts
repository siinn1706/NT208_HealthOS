import { apiRequest, buildQuery, createUploadFormData } from '../client';
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

export interface ChatImageUploadInput {
  uri: string;
  name: string;
  type: string;
}

interface SendMessageOptions {
  attachments?: ChatAttachmentInput[];
  contentType?: MessageContentType;
}

interface ParsedSseEvent {
  event: string;
  data: Record<string, unknown> | string | null;
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

function parseSseEvents(text: string): ParsedSseEvent[] {
  return text.split(/\r?\n\r?\n/)
    .map((frame) => {
      const lines = frame.split(/\r?\n/);
      const eventLine = lines.find((line) => line.startsWith('event:'));
      const dataLines = lines.filter((line) => line.startsWith('data:'));
      const rawData = dataLines.map((line) => line.slice(5).trim()).join('\n');
      let data: ParsedSseEvent['data'] = rawData || null;
      if (rawData) {
        try {
          data = JSON.parse(rawData) as Record<string, unknown>;
        } catch {
          data = rawData;
        }
      }
      return {
        event: eventLine?.slice(6).trim() ?? 'message',
        data,
      };
    })
    .filter((event) => event.event);
}

function aiStreamFailureMessage(text: string): string | null {
  const errorEvent = parseSseEvents(text).find((event) => event.event === 'error');
  if (!errorEvent) return null;
  const data = errorEvent.data;
  if (data && typeof data === 'object') {
    return String(data.detail ?? data.message ?? data.code ?? 'AI response failed.');
  }
  return typeof data === 'string' && data.trim() ? data : 'AI response failed.';
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

  /**
   * Send a message to an AI conversation via the Core streaming endpoint.
   *
   * The mobile client cannot consume SSE incrementally (React Native's Fetch
   * buffers the entire body before resolving). The full SSE text is parsed for
   * error events; incremental display is driven by WebSocket `ai:chunk` events.
   *
   * Returns the `client_message_id` that was embedded in the POST body so
   * callers can correlate the subsequent `ai:started`/`ai:completed` WS events
   * — those events echo back `client_message_id` which lets the UI deduplicate
   * against its optimistic row even when the WS event arrives before the POST
   * resolves and the optimistic row is committed.
   */
  async sendAiMessage(
    conversationId: string,
    content: string,
    options: SendMessageOptions = {},
  ): Promise<{ client_message_id: string }> {
    const clientMsgId = nextClientMessageId();
    const streamText = await apiRequest<string>(
      `/v1/conversations/${encodeURIComponent(conversationId)}/messages/stream`,
      {
        method: 'POST',
        // NOTE: The mobile Fetch implementation buffers the entire SSE body
        // before resolving. This is a known limitation of the React Native
        // runtime — true incremental SSE requires a native module or a third-
        // party streaming library. WS `ai:chunk` events cover real-time display.
        // If/when a streaming library is adopted, replace apiRequest<string>
        // with an incremental reader and remove parseSseEvents post-processing.
        headers: { Accept: 'text/event-stream' },
        timeoutMs: 120_000,
        json: {
          content,
          content_type: options.contentType ?? 'text',
          client_message_id: clientMsgId,
          attachments: options.attachments,
        },
      },
    );
    const failure = aiStreamFailureMessage(streamText);
    if (failure) throw new Error(failure);
    return { client_message_id: clientMsgId };
  },

  async sendAttachmentMessage(conversationId: string, attachment: ChatAttachmentInput, caption?: string | null) {
    const content = caption?.trim() || `Shared attachment: ${attachment.name}`;
    return sendChatMessage(conversationId, content, {
      attachments: [attachment],
      contentType: contentTypeForAttachment(attachment),
    });
  },

  async uploadImageAttachment(image: ChatImageUploadInput) {
    const response = await apiRequest<DataResponse<ChatAttachmentInput>>('/v1/conversations/uploads/image', {
      method: 'POST',
      body: createUploadFormData({}, {
        fieldName: 'image',
        uri: image.uri,
        name: image.name,
        type: image.type,
      }),
      timeoutMs: 60000,
    });
    return response.data;
  },

  async markRead(conversationId: string, lastReadMessageId: string) {
    return apiRequest<void>(`/v1/conversations/${encodeURIComponent(conversationId)}/read`, {
      method: 'POST',
      json: { last_read_message_id: lastReadMessageId },
    });
  },
};
