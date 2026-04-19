import { z } from "zod";

export const wsEventSchema = z.object({
  event: z.string(),
  payload: z.unknown().optional(),
  timestamp: z.string().optional(),
  version: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type WsEvent = z.infer<typeof wsEventSchema>;

export const heartbeatEvent = "ping";
export const heartbeatReply = "pong";
export const helloEvent = "client:hello";
export const serverHelloEvent = "server:hello";

/**
 * Per backend [chat_router.py](backend/app/ws/chat_router.py) `broadcast_dual()`,
 * each chat action emits BOTH a legacy event and a canonical `chat.*` event.
 * We collapse them to the canonical name in the dedupe LRU so a single
 * server action causes a single client render.
 */
const LEGACY_TO_CANONICAL: Record<string, string> = {
  "msg:new": "chat.message.sent",
  "msg:edit": "chat.message.edited",
  "msg:delete": "chat.message.recalled",
  "msg:react": "chat.message.reacted",
  "msg:pinned": "chat.message.pinned",
  "msg:unpinned": "chat.message.unpinned",
  "msg:read": "chat.message.read",
  typing: "chat.typing",
};

export function canonicalEventName(event: string): string {
  return LEGACY_TO_CANONICAL[event] ?? event;
}

export function dedupeKey(event: string, payload: unknown): string {
  const canonical = canonicalEventName(event);
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    const id =
      (p.server_message_id as string | undefined) ??
      (p.message_id as string | undefined) ??
      (p.client_message_id as string | undefined) ??
      ((p.message as Record<string, unknown> | undefined)?.id as string | undefined) ??
      "";
    if (id) return `${canonical}:${id}`;
  }
  return `${canonical}:${Date.now()}`;
}
