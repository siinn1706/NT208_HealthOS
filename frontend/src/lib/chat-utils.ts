import { type Conversation, type ChatParticipant } from "@/types/api";
import { CURRENT_USER_ID } from "@/data/chat";

/** Get the "other" participant in a direct conversation */
export function getOtherParticipant(conversation: Conversation): ChatParticipant | null {
  if (conversation.type === "ai") return null;
  return conversation.participants.find((p) => p.user_id !== CURRENT_USER_ID) ?? null;
}

/** Get display name for a conversation */
export function getConversationName(conversation: Conversation): string {
  if (conversation.type === "ai") return "HealthOS AI";
  if (conversation.type === "group") return conversation.name ?? "Group Chat";
  const other = getOtherParticipant(conversation);
  return other?.display_name ?? "Unknown";
}

/** Get initials for an avatar */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Format chat timestamp: today → HH:mm, yesterday → "Hôm qua", older → dd/MM */
export function formatChatTime(isoString: string, locale = "vi"): string {
  const date = new Date(isoString);
  const now = new Date();

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
    return date.toLocaleTimeString(locale === "vi" ? "vi-VN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (isYesterday) {
    return locale === "vi" ? "Hôm qua" : "Yesterday";
  }
  return date.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Full date separator label */
export function formatDateSeparator(isoString: string, locale = "vi"): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return locale === "vi" ? "Hôm nay" : "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return locale === "vi" ? "Hôm qua" : "Yesterday";

  return date.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Should messages be grouped? (same sender, within 2 min) */
export function shouldGroup(a: { sender_id: string; created_at: string }, b: { sender_id: string; created_at: string }): boolean {
  if (a.sender_id !== b.sender_id) return false;
  const diff = Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return diff < 2 * 60 * 1000;
}

/** Preview text for a message in the conversation list */
export function getMessagePreview(conversation: Conversation, currentUserId: string): string {
  const msg = conversation.last_message;
  if (!msg) return "";
  if (msg.is_recalled) return "Tin nhắn đã được thu hồi";
  if (msg.type === "image") return msg.sender_id === currentUserId ? "Bạn đã gửi một ảnh" : "Đã gửi một ảnh";
  if (msg.type === "file") return msg.sender_id === currentUserId ? "Bạn đã gửi một file" : "Đã gửi một file";
  const prefix = msg.sender_id === currentUserId ? "Bạn: " : "";
  return prefix + msg.content;
}
