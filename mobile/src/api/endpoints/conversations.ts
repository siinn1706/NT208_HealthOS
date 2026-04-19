import { apiFetch } from "../client";

/**
 * Mirrors backend `app/schemas/chat.py:ConversationDTO`.
 * Backend uses `type` (direct/group/ai) + `participants[]`, NOT `is_group` + `members[]`.
 */
export type ConversationType = "direct" | "group" | "ai";

export interface ParticipantDTO {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  is_online?: boolean;
  last_seen_at?: string | null;
}

export interface ConversationDTO {
  id: string;
  type: ConversationType;
  title?: string | null;
  avatar_url?: string | null;
  participants: ParticipantDTO[];
  last_message?: MessageDTO | null;
  unread_count?: number;
  is_muted?: boolean;
  is_pinned?: boolean;
  theme_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttachmentDTO {
  url: string;
  name: string;
  size: number;
  mime_type: string;
}

export interface ReactionDTO {
  emoji: string;
  user_id: string;
  user_display_name?: string | null;
}

export interface ReplyPreviewDTO {
  id: string;
  sender_display_name?: string | null;
  content: string;
  content_type?: string;
}

/**
 * Mirrors backend `app/schemas/chat.py:MessageDTO`.
 * Notes:
 *  - There is NO `is_edited` boolean. Use `edited_at != null` instead.
 *  - `sender_display_name` and `sender_avatar_url` come pre-joined from the server.
 */
export interface MessageDTO {
  id: string;
  conversation_id: string;
  sender_id?: string | null;
  sender_display_name?: string | null;
  sender_avatar_url?: string | null;
  client_message_id?: string | null;
  content: string;
  content_type?: string;
  attachments?: AttachmentDTO[] | null;
  reply_to_id?: string | null;
  reply_to?: ReplyPreviewDTO | null;
  is_recalled?: boolean;
  reactions?: ReactionDTO[];
  is_pinned?: boolean;
  created_at: string;
  edited_at?: string | null;
}

export async function listConversations(): Promise<ConversationDTO[]> {
  const res = await apiFetch<{ data: ConversationDTO[]; total?: number }>(
    "/v1/conversations"
  );
  return res.data;
}

export async function listPendingConversations(): Promise<ConversationDTO[]> {
  const res = await apiFetch<{ data: ConversationDTO[] }>(
    "/v1/conversations/pending"
  );
  return res.data;
}

export async function getConversation(id: string): Promise<ConversationDTO> {
  const res = await apiFetch<{ data: ConversationDTO }>(
    `/v1/conversations/${id}`
  );
  return res.data;
}

export async function createDirectConversation(targetUserId: string): Promise<ConversationDTO> {
  const res = await apiFetch<{ data: ConversationDTO }>(
    "/v1/conversations/direct",
    { method: "POST", body: { target_user_id: targetUserId } }
  );
  return res.data;
}

export async function createGroupConversation(payload: {
  title: string;
  member_ids: string[];
  avatar_url?: string;
}): Promise<ConversationDTO> {
  const res = await apiFetch<{ data: ConversationDTO }>("/v1/conversations", {
    method: "POST",
    body: payload,
  });
  return res.data;
}

export async function acceptConversation(id: string): Promise<void> {
  await apiFetch<null>(`/v1/conversations/${id}/accept`, { method: "POST" });
}

export async function rejectConversation(id: string): Promise<void> {
  await apiFetch<null>(`/v1/conversations/${id}/reject`, { method: "POST" });
}

export async function patchConversationSettings(
  id: string,
  payload: { is_muted?: boolean; is_pinned?: boolean; theme_id?: string }
): Promise<ConversationDTO> {
  const res = await apiFetch<{ data: ConversationDTO }>(
    `/v1/conversations/${id}/settings`,
    { method: "PATCH", body: payload }
  );
  return res.data;
}

export interface MessagesPage {
  data: MessageDTO[];
  has_more: boolean;
  next_cursor: string | null;
}

export async function listMessages(
  conversationId: string,
  opts: { before?: string; limit?: number } = {}
): Promise<MessagesPage> {
  return apiFetch<MessagesPage>(
    `/v1/conversations/${conversationId}/messages`,
    { query: { before: opts.before, limit: opts.limit ?? 50 } }
  );
}

export interface SendMessageInput {
  content: string;
  content_type?: string;
  client_message_id?: string;
  reply_to_id?: string;
}

export async function sendMessage(
  conversationId: string,
  payload: SendMessageInput
): Promise<MessageDTO> {
  const res = await apiFetch<{ data: MessageDTO }>(
    `/v1/conversations/${conversationId}/messages`,
    { method: "POST", body: payload }
  );
  return res.data;
}

export async function editMessage(
  conversationId: string,
  messageId: string,
  content: string
): Promise<MessageDTO> {
  const res = await apiFetch<{ data: MessageDTO }>(
    `/v1/conversations/${conversationId}/messages/${messageId}`,
    { method: "PATCH", body: { content } }
  );
  return res.data;
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
  forEveryone = true
): Promise<MessageDTO> {
  const res = await apiFetch<{ data: MessageDTO }>(
    `/v1/conversations/${conversationId}/messages/${messageId}`,
    { method: "DELETE", query: { for_everyone: forEveryone } }
  );
  return res.data;
}

export async function reactToMessage(
  conversationId: string,
  messageId: string,
  emoji: string
): Promise<MessageDTO> {
  const res = await apiFetch<{ data: MessageDTO }>(
    `/v1/conversations/${conversationId}/messages/${messageId}/reactions`,
    { method: "POST", body: { emoji } }
  );
  return res.data;
}

export async function listPinned(conversationId: string): Promise<MessageDTO[]> {
  const res = await apiFetch<{ data: MessageDTO[] }>(
    `/v1/conversations/${conversationId}/pinned`
  );
  return res.data;
}

export async function pinMessage(conversationId: string, messageId: string): Promise<void> {
  await apiFetch<null>(
    `/v1/conversations/${conversationId}/pinned/${messageId}`,
    { method: "POST" }
  );
}

export async function unpinMessage(conversationId: string, messageId: string): Promise<void> {
  await apiFetch<null>(
    `/v1/conversations/${conversationId}/pinned/${messageId}`,
    { method: "DELETE" }
  );
}

export async function markRead(
  conversationId: string,
  lastReadMessageId: string
): Promise<void> {
  await apiFetch<null>(`/v1/conversations/${conversationId}/read`, {
    method: "POST",
    body: { last_read_message_id: lastReadMessageId },
  });
}
