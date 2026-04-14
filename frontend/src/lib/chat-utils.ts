import { type Conversation, type ChatParticipant } from "@/types/api";
import { getLocaleTag } from "@/lib/format-utils";

/** Get the "other" participant in a direct conversation */
export function getOtherParticipant(
  conversation: Conversation,
  currentUserId?: string | null
): ChatParticipant | null {
  if (conversation.type === "ai") return null;
  if (!currentUserId) return conversation.participants[1] ?? conversation.participants[0] ?? null;
  return conversation.participants.find((p) => p.user_id !== currentUserId) ?? null;
}

/** Get display name for a conversation */
export function getConversationName(
  conversation: Conversation,
  currentUserId?: string | null,
  groupChatLabel = "Group Chat"
): string {
  if (conversation.type === "ai") return "HealthOS AI";
  if (conversation.type === "group") return conversation.name ?? groupChatLabel;
  const other = getOtherParticipant(conversation, currentUserId);
  return other?.display_name ?? "";
}

/** Get initials for an avatar */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Format chat timestamp: today → HH:mm, yesterday → label, older → dd/MM */
export function formatChatTime(
  isoString: string,
  locale = "vi",
  labels?: { today?: string; yesterday?: string }
): string {
  const date = new Date(isoString);
  const now = new Date();
  const localeTag = getLocaleTag(locale);

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString(localeTag, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (isYesterday) {
    return labels?.yesterday ?? (locale === "vi" ? "Hôm qua" : "Yesterday");
  }
  return date.toLocaleDateString(localeTag, {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Full date separator label */
export function formatDateSeparator(
  isoString: string,
  locale = "vi",
  labels?: { today?: string; yesterday?: string }
): string {
  const date = new Date(isoString);
  const now = new Date();
  const localeTag = getLocaleTag(locale);
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return labels?.today ?? (locale === "vi" ? "Hôm nay" : "Today");

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return labels?.yesterday ?? (locale === "vi" ? "Hôm qua" : "Yesterday");

  return date.toLocaleDateString(localeTag, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Should messages be grouped? (same sender, within 60s) */
export function shouldGroup(a: { sender_id: string; created_at: string }, b: { sender_id: string; created_at: string }): boolean {
  if (a.sender_id !== b.sender_id) return false;
  const diff = Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return diff < 60 * 1000;
}

/** Determine position within a consecutive message group.
 * Returns 'solo' | 'first' | 'middle' | 'last' based on sender + time proximity.
 */
export type GroupPosition = "solo" | "first" | "middle" | "last";

export function getGroupPosition(
  prev: { sender_id: string; created_at: string } | null,
  current: { sender_id: string; created_at: string },
  next: { sender_id: string; created_at: string } | null
): GroupPosition {
  const withPrev = prev && shouldGroup(prev, current);
  const withNext = next && shouldGroup(current, next);

  if (withPrev && withNext) return "middle";
  if (withPrev) return "last";
  if (withNext) return "first";
  return "solo";
}

/** Compute Tailwind corner-radius classes based on group position and message direction.
 * Telegram-style: tail corner (small radius) only on the last/solo message.
 */
export function getBubbleRadius(
  position: GroupPosition,
  isOwn: boolean
): string {
  if (isOwn) {
    // Outgoing: tail on bottom-right
    switch (position) {
      case "solo":
        return "rounded-2xl rounded-br-sm";
      case "first":
        return "rounded-t-2xl rounded-b-lg rounded-br-sm";
      case "middle":
        return "rounded-l-2xl rounded-r-sm";
      case "last":
        return "rounded-b-2xl rounded-tl-2xl rounded-tr-sm";
    }
  }
  // Incoming: tail on bottom-left
  switch (position) {
    case "solo":
      return "rounded-2xl rounded-bl-sm";
    case "first":
      return "rounded-t-2xl rounded-b-lg rounded-bl-sm";
    case "middle":
      return "rounded-r-2xl rounded-l-sm";
    case "last":
      return "rounded-b-2xl rounded-tr-2xl rounded-tl-sm";
  }
}

/** Preview text for a message in the conversation list */
export interface MessagePreviewLabels {
  recalled?: string;    // "Message recalled"
  imageSelf?: string;   // "You sent an image"
  imageOther?: string;  // "Sent an image"
  fileSelf?: string;    // "You sent a file"
  fileOther?: string;   // "Sent a file"
  you?: string;         // "You: " prefix
}

export function getMessagePreview(
  conversation: Conversation,
  currentUserId: string | null,
  labels?: MessagePreviewLabels
): string {
  const l = labels ?? {};
  const msg = conversation.last_message;
  if (!msg) return "";
  if (msg.is_recalled) return l.recalled ?? "";
  const isSelf = !!currentUserId && msg.sender_id === currentUserId;
  if (msg.type === "image") {
    return isSelf ? (l.imageSelf ?? "You sent an image") : (l.imageOther ?? "Sent an image");
  }
  if (msg.type === "file") {
    return isSelf ? (l.fileSelf ?? "You sent a file") : (l.fileOther ?? "Sent a file");
  }
  const prefix = isSelf ? (l.you ?? "You: ") : "";
  return prefix + msg.content;
}
