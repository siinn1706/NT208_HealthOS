"use client";

/**
 * useChat — centralised state for the entire chat feature.
 * Fetches real data from the BFF (→ Core BE); falls back to empty state if
 * the API is unavailable so the UI still renders during local dev.
 *
 * All mutation hooks call the BFF and then update local state optimistically.
 * Real-time updates arrive via useChatWs (see WS events integration below).
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { bffFetch } from "@/lib/api-client";
import type {
  Conversation,
  Message,
  MessageReaction,
  StrangerRequest,
  ChatParticipant,
} from "@/types/api";

const FALLBACK_AI_CONVERSATION: Conversation = {
  id: "ai-assistant",
  type: "ai",
  name: "HealthOS AI",
  avatar_url: null,
  participants: [],
  is_pinned: false,
  is_muted: false,
  unread_count: 0,
  theme_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ──────────────────────────────────────────────────────────────────────────────
// API response → frontend type adapters
// The backend uses slightly different field names; these helpers normalise them.
// ──────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptParticipant(p: any): ChatParticipant {
  const rawId = p.id ?? p.user_id;
  return {
    user_id: rawId != null ? String(rawId) : "",
    display_name: p.display_name ?? "",
    avatar_url: p.avatar_url ?? null,
    email: p.email ?? "",
    is_online: p.is_online ?? false,
    last_seen: p.last_seen_at ?? p.last_seen ?? null,
    role: typeof p.role === "string" ? p.role : undefined,
    is_system: Boolean(p.is_system),
  };
}

/** Pick the AI bot's user_id from a conversation's participants list, if present. */
export function findAiBotUserId(participants: ChatParticipant[] | undefined | null): string | null {
  if (!participants?.length) return null;
  const bot = participants.find(
    (p) => p.is_system === true || p.role === "assistant"
  );
  return bot?.user_id ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptReactions(reactions: any[]): MessageReaction[] {
  if (!reactions?.length) return [];
  // Backend: [{emoji, user_id, user_display_name}]
  // Frontend: [{emoji, user_ids: string[], user_names?: Record<string,string>}]
  const map = new Map<string, { user_ids: string[]; user_names: Record<string, string> }>();
  for (const r of reactions) {
    const uid = String(r.user_id ?? "");
    if (!map.has(r.emoji)) map.set(r.emoji, { user_ids: [], user_names: {} });
    const entry = map.get(r.emoji)!;
    entry.user_ids.push(uid);
    if (r.user_display_name) {
      entry.user_names[uid] = String(r.user_display_name);
    }
  }
  return Array.from(map.entries()).map(([emoji, value]) => ({
    emoji,
    user_ids: value.user_ids,
    user_names: Object.keys(value.user_names).length > 0 ? value.user_names : undefined,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptMessage(m: any): Message {
  // sender_id is the authoritative source — never infer identity from display_name
  // to prevent AI message spoofing by a user setting their name to contain "ai".
  const senderId = m.sender_id != null ? String(m.sender_id) : "";
  // Authoritative origin: prefer explicit `sender_kind` from BE (or `sender_role`),
  // fall back to legacy `"ai"` literal sender_id, then default to "user". Never
  // derive this from display name.
  const rawKind = (m.sender_kind ?? m.sender_role ?? null) as string | null;
  const senderKind: Message["sender_kind"] =
    rawKind === "ai" || rawKind === "system" || rawKind === "user"
      ? rawKind
      : senderId === "ai"
        ? "ai"
        : senderId === "system"
          ? "system"
          : "user";
  return {
    id: String(m.id),
    conversation_id: String(m.conversation_id),
    sender_id: senderId,
    sender_display_name:
      typeof m.sender_display_name === "string" ? m.sender_display_name : undefined,
    sender_kind: senderKind,
    content: m.content ?? "",
    type: (m.content_type ?? m.type ?? "text") as Message["type"],
    status: (m.status ?? "read") as Message["status"],
    reply_to: m.reply_to
      ? {
          id: String(m.reply_to.id),
          content: m.reply_to.content ?? "",
          sender_id: String(m.reply_to.sender_id ?? ""),
          sender_display_name:
            typeof m.reply_to.sender_display_name === "string"
              ? m.reply_to.sender_display_name
              : undefined,
          type: (m.reply_to.content_type ?? m.reply_to.type ?? "text") as Message["type"],
        }
      : undefined,
    reactions: adaptReactions(m.reactions ?? []),
    is_edited: Boolean(m.edited_at || m.is_edited),
    is_recalled: Boolean(m.is_recalled),
    is_pinned: Boolean(m.is_pinned),
    created_at: m.created_at ?? new Date().toISOString(),
    edited_at: m.edited_at ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptConversation(c: any): Conversation {
  const participants: ChatParticipant[] = (c.participants ?? []).map(adaptParticipant);
   
  const lastMsg = c.last_message ? adaptMessage(c.last_message) : undefined;

  return {
    id: String(c.id),
    type: c.type ?? "direct",
    name: c.title ?? c.name ?? undefined,
    avatar_url: c.avatar_url ?? null,
    participants,
    last_message: lastMsg
      ? {
          id: lastMsg.id,
          content: lastMsg.content,
          sender_id: lastMsg.sender_id,
          created_at: lastMsg.created_at,
          type: lastMsg.type,
          is_recalled: lastMsg.is_recalled,
        }
      : undefined,
    is_pinned: Boolean(c.is_pinned),
    is_muted: Boolean(c.is_muted),
    unread_count: c.unread_count ?? 0,
    theme_id: c.theme_id ?? null,
    created_at: c.created_at ?? new Date().toISOString(),
    updated_at: c.updated_at ?? new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useConversations
// ──────────────────────────────────────────────────────────────────────────────
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial load
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    bffFetch<{ data: unknown[] }>("/api/v1/conversations")
      .then(({ data }) => {
        if (!cancelled) {
          const apiConversations = data.map(adaptConversation);
          const apiAiConversation = apiConversations.find(
            (conversation) => conversation.type === "ai"
          );
          const nonAiConversations = apiConversations.filter(
            (conversation) => conversation.type !== "ai"
          );
          const aiConv = apiAiConversation
            ?? (process.env.NODE_ENV === "development" ? FALLBACK_AI_CONVERSATION : undefined);
          setConversations([
            ...(aiConv ? [aiConv] : []),
            ...nonAiConversations,
          ]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[useChat] Failed to fetch conversations — using AI fallback for dev");
            setConversations([FALLBACK_AI_CONVERSATION]);
          } else {
            setConversations([]);
          }
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const sortedConversations = useMemo(() => [...conversations].sort((a, b) => {
    if (a.type === "ai") return -1;
    if (b.type === "ai") return 1;
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    const aTime = a.last_message?.created_at ?? a.updated_at;
    const bTime = b.last_message?.created_at ?? b.updated_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  }), [conversations]);

  /** Called by WS event handler to push a new/updated conversation into state. */
  const upsertConversation = useCallback((raw: unknown) => {
    const updated = adaptConversation(raw);
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...prev[idx], ...updated };
        return next;
      }
      return [updated, ...prev];
    });
  }, []);

  const pinConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, is_pinned: !c.is_pinned } : c));
      const conv = updated.find((c) => c.id === id);
      if (conv) {
        bffFetch(`/api/v1/conversations/${id}/settings`, {
          method: "PATCH",
          body: { is_pinned: conv.is_pinned },
        }).catch(() => {
          // rollback on failure
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, is_pinned: !c.is_pinned } : c))
          );
        });
      }
      return updated;
    });
  }, []);

  const muteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, is_muted: !c.is_muted } : c));
      const conv = updated.find((c) => c.id === id);
      if (conv) {
        bffFetch(`/api/v1/conversations/${id}/settings`, {
          method: "PATCH",
          body: { is_muted: conv.is_muted },
        }).catch(() => {
          // rollback on failure
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, is_muted: !c.is_muted } : c))
          );
        });
      }
      return updated;
    });
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const setTheme = useCallback((id: string, themeId: string | null) => {
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, theme_id: themeId } : c));
      bffFetch(`/api/v1/conversations/${id}/settings`, {
        method: "PATCH",
        body: { theme_id: themeId },
      }).catch(() => {
        // rollback on failure
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, theme_id: c.theme_id } : c))
        );
      });
      return updated;
    });
  }, []);

  const markAsRead = useCallback(async (id: string, lastReadMessageId?: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
    if (!lastReadMessageId) return;
    try {
      await bffFetch(`/api/v1/conversations/${id}/read`, {
        method: "POST",
        body: { last_read_message_id: lastReadMessageId },
      });
    } catch {
      // keep optimistic local state
    }
  }, []);

  const updateLastMessage = useCallback(
    (conversationId: string, message: Message) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                last_message: {
                  id: message.id,
                  content: message.content,
                  sender_id: message.sender_id,
                  created_at: message.created_at,
                  type: message.type,
                  is_recalled: message.is_recalled,
                },
                updated_at: message.created_at,
              }
            : c
        )
      );
    },
    []
  );

  const applyIncomingMessage = useCallback(
    (raw: unknown, activeConversationId: string | null) => {
      const message = adaptMessage(raw);
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== message.conversation_id) return conversation;
          const shouldIncreaseUnread = activeConversationId !== conversation.id;
          const isNewLastMessage = conversation.last_message?.id !== message.id;
          return {
            ...conversation,
            last_message: {
              id: message.id,
              content: message.content,
              sender_id: message.sender_id,
              created_at: message.created_at,
              type: message.type,
              is_recalled: message.is_recalled,
            },
            updated_at: message.created_at,
            unread_count: shouldIncreaseUnread && isNewLastMessage
              ? conversation.unread_count + 1
              : conversation.unread_count,
          };
        })
      );
    },
    []
  );

  const createConversation = useCallback(async (targetUserId: string): Promise<Conversation | null> => {
    try {
      const result = await bffFetch<{ data: unknown }>("/api/v1/conversations/direct", {
        method: "POST",
        body: { target_user_id: targetUserId },
      });
      const conv = adaptConversation(result.data);
      setConversations((prev) => {
        if (prev.find((c) => c.id === conv.id)) return prev;
        return [conv, ...prev];
      });
      return conv;
    } catch {
      return null;
    }
  }, []);

  return {
    conversations: sortedConversations,
    isLoading,
    pinConversation,
    muteConversation,
    deleteConversation,
    setTheme,
    markAsRead,
    updateLastMessage,
    applyIncomingMessage,
    createConversation,
    upsertConversation,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useMessages
// ──────────────────────────────────────────────────────────────────────────────
export interface UseMessagesOptions {
  /** Shown in optimistic reaction payloads (e.g. translated "You") */
  selfReactionLabel?: string;
}

export function useMessages(
  conversationId: string | null,
  currentUserId: string | null = null,
  options: UseMessagesOptions = {}
) {
  const { selfReactionLabel = "You" } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  // B7 P6 — AI streaming state. `null` means no stream in flight.
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const lastCursorRef = useRef<string | null>(null);

  // Load messages when conversationId changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    if (conversationId === FALLBACK_AI_CONVERSATION.id) {
      setMessages([]);
      setHasMore(false);
      lastCursorRef.current = null;
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    lastCursorRef.current = null;

    bffFetch<{ data: unknown[]; has_more: boolean; next_cursor: string | null }>(
      `/api/v1/conversations/${conversationId}/messages?limit=50`
    )
      .then(({ data, has_more, next_cursor }) => {
        if (!cancelled) {
          // API returns newest-first; reverse to display oldest-at-top
          setMessages(data.map(adaptMessage).reverse());
          setHasMore(has_more);
          lastCursorRef.current = next_cursor ?? null;
        }
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [conversationId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * Refetch the active conversation's most recent page from the BFF.
   *
   * Used after a WS reconnect to rescue any state that may have changed
   * while the socket was offline — most importantly, an AI bot reply that
   * landed `ai:completed` between disconnect and reconnect would otherwise
   * leave a stuck `streaming` placeholder bubble (FE review C6).
   *
   * Idempotent and conversation-aware: no-op when no conversation is active
   * or for the dev FALLBACK_AI_CONVERSATION (which has no real DB rows).
   */
  const refetchActiveConversation = useCallback(async () => {
    if (!conversationId || conversationId === FALLBACK_AI_CONVERSATION.id) return;
    try {
      const { data, has_more, next_cursor } = await bffFetch<{
        data: unknown[];
        has_more: boolean;
        next_cursor: string | null;
      }>(`/api/v1/conversations/${conversationId}/messages?limit=50`);
      setMessages(data.map(adaptMessage).reverse());
      setHasMore(has_more);
      lastCursorRef.current = next_cursor ?? null;
    } catch {
      /* leave existing state — next manual interaction will retry */
    }
  }, [conversationId]);

  const loadMoreInFlightRef = useRef<Promise<number> | null>(null);

  /** Load older messages (scroll-up pagination). Returns count prepended, or 0. */
  const loadMore = useCallback(async (): Promise<number> => {
    const beforeCursor = lastCursorRef.current;
    if (!conversationId || !hasMore || !beforeCursor) return 0;
    if (loadMoreInFlightRef.current) return loadMoreInFlightRef.current;

    const request = (async (): Promise<number> => {
      try {
        const { data, has_more, next_cursor } = await bffFetch<{
          data: unknown[];
          has_more: boolean;
          next_cursor: string | null;
        }>(`/api/v1/conversations/${conversationId}/messages?limit=50&before=${encodeURIComponent(beforeCursor)}`);
        const older = data.map(adaptMessage).reverse();
        if (older.length === 0) {
          setHasMore(has_more);
          lastCursorRef.current = next_cursor ?? null;
          return 0;
        }
        let prepended = 0;
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const mergedOlder = older.filter((m) => !existing.has(m.id));
          prepended = mergedOlder.length;
          return [...mergedOlder, ...prev];
        });
        setHasMore(has_more);
        lastCursorRef.current = next_cursor ?? null;
        return prepended;
      } catch {
        return 0;
      } finally {
        loadMoreInFlightRef.current = null;
      }
    })();

    loadMoreInFlightRef.current = request;
    return request;
  }, [conversationId, hasMore]);

  /** Called by WS event handler to upsert a message into state. */
  const upsertMessage = useCallback((raw: unknown) => {
    const msg = adaptMessage(raw);
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = msg;
        return next.filter((m, i) => m.id !== msg.id || i === idx);
      }
      return [...prev, msg];
    });
  }, []);

  /** Called by WS pin/unpin events — toggles is_pinned on a message already in state. */
  const setPinnedState = useCallback((msgId: string, isPinned: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, is_pinned: isPinned } : m))
    );
  }, []);

  /** Called by WS typing event. */
  const setRemoteTyping = useCallback((typing: boolean) => {
    setIsTyping(typing);
  }, []);

  // ── AI streaming reducers (WS-driven) ────────────────────────────────────
  // Used when the AI bot reply is broadcast asynchronously via the chat WS:
  // BE persists a placeholder Message with status="streaming", emits
  // `ai:started`, then `ai:chunk` deltas, then `ai:completed` with the final
  // MessageDTO. Each handler is keyed by `message_id` so multiple in-flight
  // streams (rare, possible across tabs) don't collide.
  //
  // The HTTP/SSE variant `streamAiMessage` below is a parallel path used by
  // call sites that initiate the stream from the FE directly (e.g. the
  // dedicated "Ask AI" composer). Both paths can coexist — the WS handlers
  // are passive and the SSE caller is explicit.

  /** Insert a placeholder bubble when the BE signals the AI started replying. */
  const onAiStreamStarted = useCallback(
    (raw: { message_id?: string; conversation_id?: string; sender_id?: string }) => {
      const msgId = raw.message_id;
      const convId = raw.conversation_id;
      const senderId = raw.sender_id;
      if (!msgId || !convId || !senderId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msgId)) return prev;
        const placeholder: Message = {
          id: msgId,
          conversation_id: convId,
          sender_id: senderId,
          sender_display_name: "HealthOS AI Assistant",
          sender_kind: "ai",
          content: "",
          type: "text",
          status: "streaming",
          reactions: [],
          is_edited: false,
          is_recalled: false,
          is_pinned: false,
          created_at: new Date().toISOString(),
        };
        return [...prev, placeholder];
      });
    },
    []
  );

  /** Append a delta to the streaming bubble identified by message_id. */
  const onAiStreamChunk = useCallback(
    (raw: { message_id?: string; delta?: string }) => {
      const msgId = raw.message_id;
      const delta = raw.delta;
      if (!msgId || !delta) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, content: m.content + delta, status: "streaming" }
            : m
        )
      );
    },
    []
  );

  /** Replace the placeholder content with the final MessageDTO from the BE. */
  const onAiStreamCompleted = useCallback((raw: unknown) => {
    const msg = adaptMessage(raw);
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx < 0) return [...prev, { ...msg, status: "read" }];
      const next = [...prev];
      next[idx] = { ...msg, status: "read" };
      return next;
    });
  }, []);

  /**
   * B7 P6 — AI streaming send.
   *
   * Posts the user message to `/api/v1/conversations/{id}/messages/stream`
   * (SSE). Inserts an optimistic user message + a placeholder assistant
   * message; updates the assistant message in place as `delta` events
   * arrive. `done`, `aborted`, and `error` events all terminate the stream.
   *
   * Returns the optimistic user `Message` so callers can update their
   * outbox UI synchronously.
   */
  const streamAiMessage = useCallback(
    async (convId: string, content: string): Promise<Message | null> => {
      if (!currentUserId) return null;
      // Cancel any prior stream — the user can only have one in flight per hook instance.
      streamAbortRef.current?.abort();
      const controller = new AbortController();
      streamAbortRef.current = controller;

      const optimisticUserId = `opt-user-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
      const optimisticAssistantId = `opt-ai-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
      const now = new Date().toISOString();

      const optimisticUser: Message = {
        id: optimisticUserId,
        conversation_id: convId,
        sender_id: currentUserId,
        sender_display_name: undefined,
        sender_kind: "user",
        content,
        type: "text",
        status: "sent",
        reply_to: undefined,
        reactions: [],
        is_edited: false,
        is_recalled: false,
        is_pinned: false,
        created_at: now,
      };
      const optimisticAssistant: Message = {
        id: optimisticAssistantId,
        conversation_id: convId,
        sender_id: undefined,
        sender_display_name: undefined,
        sender_kind: "ai",
        content: "",
        type: "text",
        status: "sending",
        reply_to: undefined,
        reactions: [],
        is_edited: false,
        is_recalled: false,
        is_pinned: false,
        created_at: now,
      };
      setMessages((prev) => [...prev, optimisticUser, optimisticAssistant]);
      setIsTyping(true);
      setStreamingAssistantId(optimisticAssistantId);

      let serverAssistantId: string | null = null;

      const replaceAssistant = (mutator: (m: Message) => Message) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === (serverAssistantId ?? optimisticAssistantId) ? mutator(m) : m)),
        );
      };

      try {
        const res = await fetch(`/api/v1/conversations/${convId}/messages/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({
            content,
            content_type: "text",
            client_message_id: optimisticUserId,
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          replaceAssistant((m) => ({ ...m, status: "failed" as const }));
          setIsTyping(false);
          setStreamingAssistantId(null);
          return optimisticUser;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        // Standard SSE parser — events end on a blank line.
        // Each event has `event: NAME\n` (optional) and `data: PAYLOAD\n` lines.
        // Multiple `data:` lines concatenate with `\n`.
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let separator = buffer.indexOf("\n\n");
          while (separator >= 0) {
            const frame = buffer.slice(0, separator);
            buffer = buffer.slice(separator + 2);
            separator = buffer.indexOf("\n\n");
            const lines = frame.split("\n");
            let eventName = "message";
            const dataParts: string[] = [];
            for (const line of lines) {
              if (line.startsWith("event:")) eventName = line.slice(6).trim();
              else if (line.startsWith("data:")) dataParts.push(line.slice(5).trim());
            }
            if (dataParts.length === 0) continue;
            const payload = dataParts.join("\n");
            if (eventName === "ping") continue;

            let parsed: Record<string, unknown> = {};
            try {
              parsed = payload ? JSON.parse(payload) : {};
            } catch {
              parsed = {};
            }

            if (eventName === "start") {
              const assistantId = (parsed["assistant_message_id"] as string | undefined) ?? null;
              if (assistantId) {
                serverAssistantId = assistantId;
                setMessages((prev) =>
                  prev.map((m) => (m.id === optimisticAssistantId ? { ...m, id: assistantId } : m)),
                );
                setStreamingAssistantId(assistantId);
              }
            } else if (eventName === "delta") {
              const text = (parsed["text"] as string | undefined) ?? "";
              if (text) replaceAssistant((m) => ({ ...m, content: m.content + text }));
            } else if (eventName === "done") {
              replaceAssistant((m) => ({ ...m, status: "sent" as const }));
            } else if (eventName === "aborted") {
              replaceAssistant((m) => ({ ...m, status: "sent" as const }));
            } else if (eventName === "error") {
              replaceAssistant((m) => ({ ...m, status: "failed" as const }));
            }
          }
        }
      } catch (err) {
        if ((err as { name?: string } | null)?.name === "AbortError") {
          // Stop button — leave the partial bubble in place.
          replaceAssistant((m) => ({ ...m, status: "sent" as const }));
        } else {
          replaceAssistant((m) => ({ ...m, status: "failed" as const }));
        }
      } finally {
        if (streamAbortRef.current === controller) streamAbortRef.current = null;
        setIsTyping(false);
        setStreamingAssistantId(null);
      }
      return optimisticUser;
    },
    [currentUserId],
  );

  const stopStreaming = useCallback(() => {
    streamAbortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (
      convId: string,
      content: string,
      replyToId?: string,
      onMessageSent?: (msg: Message) => void,
      /**
       * Invoked when the BFF call fails with a network/connectivity error
       * (`error_code === "network"`) so the caller can transparently take
       * ownership of redelivery — typically by calling `markMessageQueued`
       * + `useOutboundQueue.enqueue` to persist the payload to IndexedDB.
       *
       * Without this hook, a transient BFF outage during an "online" send
       * would leave the bubble stuck at `failed` and require the user to
       * manually retry (CRITICAL C5 in the FE review).
       */
      onNetworkFailure?: (msg: Message) => void | Promise<void>,
    ): Promise<Message> => {
      // Require a valid currentUserId before sending — the session must be
      // loaded.  Without it the optimistic message would carry a sentinel ID
      // that breaks sender comparison and may cause duplicate rendering.
      if (!currentUserId) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[useChat] sendMessage blocked: user session not loaded");
        }
        throw new Error("Cannot send message: user session not loaded");
      }
      // Use crypto.randomUUID() for collision-free IDs even when multiple
      // messages are sent in the same millisecond.
      const optimisticId = `optimistic-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
      const optimistic: Message = {
        id: optimisticId,
        conversation_id: convId,
        sender_id: currentUserId,
        sender_display_name: undefined,
        sender_kind: "user",
        content,
        type: "text",
        status: "sending",
        reply_to: undefined,
        reactions: [],
        is_edited: false,
        is_recalled: false,
        is_pinned: false,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      onMessageSent?.(optimistic);

      try {
        const result = await bffFetch<{ data: unknown }>(
          `/api/v1/conversations/${convId}/messages`,
          {
            method: "POST",
            body: {
              content,
              content_type: "text",
              client_message_id: optimisticId,
              reply_to_id: replyToId ?? null,
            },
          }
        );
        const confirmed = adaptMessage(result.data);
        setMessages((prev) => {
          const next = prev.map((m) => (m.id === optimisticId ? confirmed : m));
          const firstConfirmedIdx = next.findIndex((m) => m.id === confirmed.id);
          if (firstConfirmedIdx < 0) return next;
          return next.filter((m, idx) => m.id !== confirmed.id || idx === firstConfirmedIdx);
        });
        return confirmed;
      } catch (err) {
        const errorCode: NonNullable<Message["error_code"]> = (() => {
          const status = (err as { status?: number } | null)?.status;
          if (status === 429) return "rate_limited";
          if (status === 400 || status === 422) return "validation";
          if (status && status >= 400) return "unknown";
          return "network";
        })();
        const failed: Message = {
          ...optimistic,
          status: "failed" as const,
          error_code: errorCode,
        };
        setMessages((prev) => prev.map((m) => (m.id === optimisticId ? failed : m)));

        // Network-class failures are safe to auto-enqueue — the BFF rejected
        // the request because of connectivity, not validation. Hand the
        // bubble off to the outbound queue so a reconnect drains it.
        if (errorCode === "network" && onNetworkFailure) {
          try {
            await onNetworkFailure(failed);
          } catch {
            /* caller's responsibility — keep the failed state visible */
          }
        }

        return failed;
      }
    },
    [currentUserId]
  );

  /**
   * Re-send a previously failed outgoing message. The original optimistic row
   * is removed first so `sendMessage` can produce a fresh optimistic+confirmed
   * pair (and emit the WS event again). No-op for messages that aren't owned
   * by the current user or aren't in a failed/queued state.
   */
  const retryMessage = useCallback(
    async (messageId: string): Promise<Message | null> => {
      const target = messages.find((m) => m.id === messageId);
      if (!target) return null;
      // Only the user's own failed/queued messages are retryable. Critically
      // we never touch a `streaming` AI bubble — the worker still owns it.
      if (target.status !== "failed" && target.status !== "queued") return null;
      if (currentUserId && target.sender_id !== currentUserId) return null;
      const replyToId = target.reply_to?.id;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      return sendMessage(target.conversation_id, target.content, replyToId);
    },
    [messages, currentUserId, sendMessage]
  );

  /**
   * Discard a failed/queued outgoing message from the local outbox.
   * Streaming AI bubbles are explicitly excluded — they're owned by the
   * worker until `ai:completed` arrives.
   */
  const discardMessage = useCallback((messageId: string) => {
    setMessages((prev) => {
      const target = prev.find((m) => m.id === messageId);
      if (!target) return prev;
      if (target.status !== "failed" && target.status !== "queued") return prev;
      return prev.filter((m) => m.id !== messageId);
    });
  }, []);

  /**
   * Promote a `failed` (network-error) message to `queued`, signalling that
   * the outbound queue has taken ownership of redelivery. Caller is expected
   * to also persist the item in IndexedDB via `useOutboundQueue.enqueue`.
   * No-op if the message no longer exists, is `streaming` (AI bot owned),
   * or isn't otherwise in a recoverable state.
   */
  const markMessageQueued = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        // Never demote a streaming AI bubble — it isn't ours to reroute.
        if (m.status === "streaming") return m;
        if (m.status !== "failed" && m.status !== "sending") return m;
        return { ...m, status: "queued" as const, error_code: undefined };
      })
    );
  }, []);

  /**
   * Synthesise an optimistic `queued` message without firing a network call —
   * used when the user composes while offline. The caller still owns persisting
   * the payload to IndexedDB via `useOutboundQueue.enqueue`.
   */
  const enqueueOptimisticMessage = useCallback(
    (convId: string, content: string, replyToId?: string): Message | null => {
      if (!currentUserId) return null;
      const optimisticId = `optimistic-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
      const optimistic: Message = {
        id: optimisticId,
        conversation_id: convId,
        sender_id: currentUserId,
        sender_display_name: undefined,
        sender_kind: "user",
        content,
        type: "text",
        status: "queued",
        reply_to: replyToId
          ? { id: replyToId, content: "", sender_id: "", type: "text" }
          : undefined,
        reactions: [],
        is_edited: false,
        is_recalled: false,
        is_pinned: false,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      return optimistic;
    },
    [currentUserId]
  );

  const editMessage = useCallback(async (convId: string, messageId: string, content: string) => {
    // Capture state for rollback before applying optimistic update
    let prevMessages: Message[] | null = null;
    setMessages((prev) => {
      prevMessages = prev;
      return prev.map((m) =>
        m.id === messageId ? { ...m, content, is_edited: true, edited_at: new Date().toISOString() } : m
      );
    });
    try {
      const result = await bffFetch<{ data: unknown }>(
        `/api/v1/conversations/${convId}/messages/${messageId}`,
        { method: "PATCH", body: { content } }
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? adaptMessage(result.data) : m))
      );
    } catch {
      // Rollback to state before optimistic update
      if (prevMessages) setMessages(prevMessages);
    }
  }, []);

  const recallMessage = useCallback(async (convId: string, messageId: string) => {
    let prevMessages: Message[] | null = null;
    setMessages((prev) => {
      prevMessages = prev;
      return prev.map((m) => (m.id === messageId ? { ...m, content: "", is_recalled: true } : m));
    });
    try {
      await bffFetch(
        `/api/v1/conversations/${convId}/messages/${messageId}`,
        { method: "DELETE" }
      );
    } catch {
      // Rollback — message was not actually recalled
      if (prevMessages) setMessages(prevMessages);
    }
  }, []);

  const deleteMessage = useCallback(async (convId: string, messageId: string) => {
    let prevMessages: Message[] | null = null;
    setMessages((prev) => {
      prevMessages = prev;
      return prev.filter((m) => m.id !== messageId);
    });
    try {
      await bffFetch(
        `/api/v1/conversations/${convId}/messages/${messageId}?for_everyone=false`,
        { method: "DELETE" }
      );
    } catch {
      // Rollback — message was not actually deleted
      if (prevMessages) setMessages(prevMessages);
    }
  }, []);

  const pinMessage = useCallback(async (convId: string, messageId: string) => {
    let wasPinned = false;
    setMessages((prev) => {
      const msg = prev.find((m) => m.id === messageId);
      wasPinned = Boolean(msg?.is_pinned);
      return prev.map((m) => (m.id === messageId ? { ...m, is_pinned: !m.is_pinned } : m));
    });
    try {
      if (wasPinned) {
        await bffFetch(`/api/v1/conversations/${convId}/pinned/${messageId}`, { method: "DELETE" });
      } else {
        await bffFetch(`/api/v1/conversations/${convId}/pinned/${messageId}`, { method: "POST" });
      }
    } catch {
      // optimistic stays
    }
  }, []);

  const reactToMessage = useCallback(
    async (convId: string, messageId: string, emoji: string) => {
      const selfDisplayName = selfReactionLabel;
      // Optimistic toggle — only update local state when userId is known
      if (currentUserId) {
        const selfUserId = currentUserId;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            const existing = m.reactions.find((r) => r.emoji === emoji);
            let newReactions: MessageReaction[];
            if (existing) {
              const hasReacted = existing.user_ids.includes(selfUserId);
              if (hasReacted) {
                const filtered = existing.user_ids.filter((id) => id !== selfUserId);
                const userNames = { ...(existing.user_names ?? {}) };
                delete userNames[selfUserId];
                newReactions = filtered.length === 0
                  ? m.reactions.filter((r) => r.emoji !== emoji)
                  : m.reactions.map((r) =>
                      r.emoji === emoji
                        ? {
                            ...r,
                            user_ids: filtered,
                            user_names: Object.keys(userNames).length > 0 ? userNames : undefined,
                          }
                        : r
                    );
              } else {
                newReactions = m.reactions.map((r) =>
                  r.emoji === emoji
                    ? {
                        ...r,
                        user_ids: [...r.user_ids, selfUserId],
                        user_names: {
                          ...(r.user_names ?? {}),
                          [selfUserId]: selfDisplayName,
                        },
                      }
                    : r
                );
              }
            } else {
              newReactions = [
                ...m.reactions,
                { emoji, user_ids: [selfUserId], user_names: { [selfUserId]: selfDisplayName } },
              ];
            }
            return { ...m, reactions: newReactions };
          })
        );
      }
      try {
        await bffFetch(`/api/v1/conversations/${convId}/messages/${messageId}/reactions`, {
          method: "POST",
          body: { emoji },
        });
      } catch {
        // optimistic stays
      }
    },
    [currentUserId, selfReactionLabel]
  );

  // P0 — `simulateAIReply` was removed. Faking AI replies in the UI without an
  // explicit `sender_kind:"ai"` from the server bypasses every safety guard on
  // the AI surface (disclaimer, rate-limits, audit logs, content filters). All
  // AI replies must originate from the AI worker via the BFF (either the WS
  // stream handlers above or the `streamAiMessage` SSE caller).

  return {
    messages,
    isLoading,
    hasMore,
    isTyping,
    streamingAssistantId,
    loadMore,
    refetchActiveConversation,
    upsertMessage,
    setPinnedState,
    setRemoteTyping,
    sendMessage,
    streamAiMessage,
    stopStreaming,
    retryMessage,
    discardMessage,
    markMessageQueued,
    enqueueOptimisticMessage,
    editMessage,
    recallMessage,
    deleteMessage,
    pinMessage,
    reactToMessage,
    onAiStreamStarted,
    onAiStreamChunk,
    onAiStreamCompleted,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useStrangerRequests
// ──────────────────────────────────────────────────────────────────────────────
export function useStrangerRequests() {
  const [requests, setRequests] = useState<StrangerRequest[]>([]);

  // Load pending conversations from API
  useEffect(() => {
    let cancelled = false;
    bffFetch<{ data: unknown[] }>("/api/v1/conversations/pending")
      .then(({ data }) => {
        if (!cancelled) {
          // Adapt to StrangerRequest shape from conversation DTOs
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const adapted: StrangerRequest[] = data.map((c: any) => {
            const initiator = (c.participants ?? [])[0];
            return {
              id: String(c.id),
              from_user: adaptParticipant(initiator ?? {}),
              message_preview: c.last_message?.content ?? "",
              status: "pending",
              created_at: c.created_at ?? new Date().toISOString(),
            };
          });
          setRequests(adapted);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const pendingRequests = requests.filter((r) => r.status === "pending");

  const acceptRequest = useCallback(async (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "accepted" } : r))
    );
    try {
      await bffFetch(`/api/v1/conversations/${id}/accept`, { method: "POST" });
    } catch {
      // optimistic stays
    }
  }, []);

  const rejectRequest = useCallback(async (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r))
    );
    try {
      await bffFetch(`/api/v1/conversations/${id}/reject`, { method: "POST" });
    } catch {
      // optimistic stays
    }
  }, []);

  const blockRequest = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "blocked" } : r))
    );
    // TODO: block endpoint when added to backend
  }, []);

  return { requests, pendingRequests, acceptRequest, rejectRequest, blockRequest };
}

// ──────────────────────────────────────────────────────────────────────────────
// useChatSearch — searches conversations in local state + real user lookup
// ──────────────────────────────────────────────────────────────────────────────
export function useChatSearch(
  conversations: Conversation[] = [],
  currentUserId: string | null = null
) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return conversations.filter((c) => {
      const name =
        c.type === "ai"
          ? "healthos ai assistant"
          : c.type === "group"
          ? (c.name ?? "").toLowerCase()
          : (c.participants.find((p) => p.user_id !== currentUserId)?.display_name ?? "")
              .toLowerCase();
      const lastMsg = c.last_message?.content.toLowerCase() ?? "";
      return name.includes(q) || lastMsg.includes(q);
    });
  }, [query, conversations, currentUserId]);

  return { query, setQuery, filtered };
}

// ──────────────────────────────────────────────────────────────────────────────
// useTypingState — local typing indicator + WS broadcast
// ──────────────────────────────────────────────────────────────────────────────
export function useTypingState(
  conversationId?: string | null,
  sendWsEvent?: (event: string, payload?: Record<string, unknown>) => void
) {
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const onKeyPress = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setIsTypingLocal(true);
      if (conversationId && sendWsEvent) {
        sendWsEvent("typing", { conversation_id: conversationId, is_typing: true });
      }
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      setIsTypingLocal(false);
      if (conversationId && sendWsEvent) {
        sendWsEvent("typing", { conversation_id: conversationId, is_typing: false });
      }
    }, 2000);
  }, [conversationId, sendWsEvent]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  return { isTypingLocal, onKeyPress };
}

