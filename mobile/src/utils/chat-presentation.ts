import dayjs from "dayjs";
import type { ConversationDTO, MessageDTO } from "@/api/endpoints/conversations";

/** Optimistic / failed rows on the client — not part of the wire DTO. */
export type ClientPendingFlags = { __pending?: boolean; __failed?: boolean };

export const CHAT_PREVIEW_MAX_LEN = 60;

export function truncateChatPreview(text: string, maxLen = CHAT_PREVIEW_MAX_LEN): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}

export function getConversationDisplayTitle(
  c: ConversationDTO,
  meId: string | null | undefined,
  fallbacks: { group: string; direct: string }
): string {
  if (c.title) return c.title;
  if (c.type !== "direct") return fallbacks.group;
  const other = c.participants?.find((p) => p.id !== meId);
  return other?.display_name ?? fallbacks.direct;
}

/**
 * One-line preview for the conversation list: recalled handling, optional "You:"
 * prefix for self, truncated body.
 */
export function getConversationListPreview(
  c: ConversationDTO,
  meId: string | null | undefined,
  labels: { recalled: string; emptyDash: string; youPrefix: string }
): string {
  const msg = c.last_message;
  if (!msg) return labels.emptyDash;
  if (msg.is_recalled) return labels.recalled;
  const body = truncateChatPreview(msg.content ?? "");
  const isSelf = !!meId && msg.sender_id === meId;
  if (isSelf) return `${labels.youPrefix}${body}`;
  return body;
}

export type TimestampMeta = { sender_id?: string | null; created_at: string };

/** Older message first, newer second — same calendar grouping window as web (~1 min). */
export function shouldGroupMessages(older: TimestampMeta, newer: TimestampMeta): boolean {
  if (!older.sender_id || !newer.sender_id) return false;
  if (older.sender_id !== newer.sender_id) return false;
  const diff = Math.abs(new Date(newer.created_at).getTime() - new Date(older.created_at).getTime());
  return diff < 60 * 1000;
}

export type GroupPosition = "solo" | "first" | "middle" | "last";

/**
 * `merged` list is newest-first (index 0 = latest). Pass:
 * - `olderBelow` = merged[i + 1]
 * - `newerAbove` = merged[i - 1]
 */
export function getMessageGroupPosition(
  olderBelow: TimestampMeta | null | undefined,
  current: TimestampMeta,
  newerAbove: TimestampMeta | null | undefined
): GroupPosition {
  const withOlder = olderBelow && shouldGroupMessages(olderBelow, current);
  const withNewer = newerAbove && shouldGroupMessages(current, newerAbove);

  if (withOlder && withNewer) return "middle";
  if (withOlder) return "last";
  if (withNewer) return "first";
  return "solo";
}

/**
 * Messenger-style: show timestamp when sender changes, long gap, or cluster boundary.
 * `olderBelow` is the next item in the list (older in time); `newerAbove` is the
 * previous item (newer in time).
 */
export function shouldShowMessageTimestamp(
  olderBelow: TimestampMeta | null | undefined,
  newerAbove: TimestampMeta | null | undefined,
  current: TimestampMeta
): boolean {
  if (!olderBelow) return true;
  const olderTime = new Date(olderBelow.created_at).getTime();
  const curTime = new Date(current.created_at).getTime();
  const diffMs = curTime - olderTime;
  if (olderBelow.sender_id !== current.sender_id) return true;
  if (diffMs > 5 * 60 * 1000) return true;
  if (!newerAbove) return true;
  if (newerAbove.sender_id !== current.sender_id) return true;
  if (Math.abs(new Date(newerAbove.created_at).getTime() - curTime) > 5 * 60 * 1000) return true;
  return false;
}

export function shouldShowDateSeparatorBefore(
  current: TimestampMeta,
  olderBelow: TimestampMeta | null | undefined
): boolean {
  // Oldest visible message (no neighbor further down the inverted list) still
  // needs a day label so multi-day threads don't leave the bottom bucket bare.
  if (!olderBelow) return true;
  return !dayjs(current.created_at).isSame(dayjs(olderBelow.created_at), "day");
}

/** Label for a date separator row (not for bubble inline time). */
export function formatChatDateSeparatorLabel(
  iso: string,
  labels: { today: string; yesterday: string },
  formatMonthDay: (d: Date) => string,
  reference: Date = new Date()
): string {
  const messageDay = dayStart(new Date(iso));
  const today = dayStart(reference);
  if (messageDay.getTime() === today.getTime()) return labels.today;
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  if (messageDay.getTime() === yest.getTime()) return labels.yesterday;
  return formatMonthDay(new Date(iso));
}

function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function shouldShowSenderLabel(
  isGroup: boolean,
  isMine: boolean,
  olderBelow: TimestampMeta | null | undefined,
  current: TimestampMeta
): boolean {
  if (!isGroup || isMine) return false;
  if (!olderBelow) return true;
  if (olderBelow.sender_id !== current.sender_id) return true;
  return !shouldGroupMessages(olderBelow, current);
}

/**
 * Merge server-fetched rows (newest-first) with still-pending optimistic rows
 * (stored newest-first). Pending is merged oldest→newest so `unshift` does not
 * reverse rapid-send order. Server rows win when `client_message_id` matches.
 */
export function mergeVisibleChatMessages<T extends MessageDTO & ClientPendingFlags>(
  serverNewestFirst: T[],
  pendingNewestFirst: T[]
): T[] {
  const seenClient = new Set<string>();
  const visible: T[] = [];
  for (const m of serverNewestFirst) {
    visible.push(m);
    if (m.client_message_id) seenClient.add(m.client_message_id);
  }
  for (let i = pendingNewestFirst.length - 1; i >= 0; i--) {
    const p = pendingNewestFirst[i]!;
    if (p.client_message_id && seenClient.has(p.client_message_id)) continue;
    visible.unshift(p);
  }
  return visible;
}

/** Whether a row may open the server-backed message action sheet (reactions, pin, edit, delete). */
export function isMessageActionSheetEligible(m: MessageDTO & ClientPendingFlags): boolean {
  if (m.__pending || m.__failed) return false;
  if (m.is_recalled) return false;
  return true;
}
