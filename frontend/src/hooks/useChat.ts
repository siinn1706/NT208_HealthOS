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

// Keep mock data as dev fallback only
import {
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_STRANGER_REQUESTS,
  CURRENT_USER_ID,
} from "@/data/chat";

const AI_CONVERSATION = MOCK_CONVERSATIONS.find((conversation) => conversation.type === "ai")!;

// ──────────────────────────────────────────────────────────────────────────────
// API response → frontend type adapters
// The backend uses slightly different field names; these helpers normalise them.
// ──────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptParticipant(p: any): ChatParticipant {
  return {
    user_id: String(p.id ?? p.user_id ?? ""),
    display_name: p.display_name ?? "",
    avatar_url: p.avatar_url ?? null,
    email: p.email ?? "",
    is_online: p.is_online ?? false,
    last_seen: p.last_seen_at ?? p.last_seen ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptReactions(reactions: any[]): MessageReaction[] {
  if (!reactions?.length) return [];
  // Backend: [{emoji, user_id, user_display_name}]
  // Frontend: [{emoji, user_ids: string[]}]
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    const uid = String(r.user_id ?? "");
    if (!map.has(r.emoji)) map.set(r.emoji, []);
    map.get(r.emoji)!.push(uid);
  }
  return Array.from(map.entries()).map(([emoji, user_ids]) => ({ emoji, user_ids }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptMessage(m: any): Message {
  return {
    id: String(m.id),
    conversation_id: String(m.conversation_id),
    sender_id: String(m.sender_id ?? ""),
    content: m.content ?? "",
    type: (m.content_type ?? m.type ?? "text") as Message["type"],
    status: (m.status ?? "read") as Message["status"],
    reply_to: m.reply_to
      ? {
          id: String(m.reply_to.id),
          content: m.reply_to.content ?? "",
          sender_id: String(m.reply_to.sender_id ?? ""),
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
  const [conversations, setConversations] = useState<Conversation[]>([AI_CONVERSATION]);
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
          setConversations([
            apiAiConversation ?? AI_CONVERSATION,
            ...nonAiConversations,
          ]);
        }
      })
      .catch(() => {
        if (!cancelled) setConversations([AI_CONVERSATION]);
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
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_pinned: !c.is_pinned } : c))
    );
    // TODO: persist pin preference when backend endpoint is added
  }, []);

  const muteConversation = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_muted: !c.is_muted } : c))
    );
    // TODO: persist mute preference when backend endpoint is added
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const setTheme = useCallback((id: string, themeId: string | null) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, theme_id: themeId } : c))
    );
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
            unread_count: shouldIncreaseUnread
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
export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
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

    if (conversationId === "conv-ai") {
      setMessages(MOCK_MESSAGES["conv-ai"] ?? []);
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

  /** Load older messages (scroll-up pagination). */
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore || !lastCursorRef.current) return;
    try {
      const { data, has_more, next_cursor } = await bffFetch<{
        data: unknown[];
        has_more: boolean;
        next_cursor: string | null;
      }>(`/api/v1/conversations/${conversationId}/messages?limit=50&before=${encodeURIComponent(lastCursorRef.current)}`);
      const older = data.map(adaptMessage).reverse();
      setMessages((prev) => [...older, ...prev]);
      setHasMore(has_more);
      lastCursorRef.current = next_cursor ?? null;
    } catch {
      // ignore
    }
  }, [conversationId, hasMore]);

  /** Called by WS event handler to upsert a message into state. */
  const upsertMessage = useCallback((raw: unknown) => {
    const msg = adaptMessage(raw);
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = msg;
        return next;
      }
      return [...prev, msg];
    });
  }, []);

  /** Called by WS typing event. */
  const setRemoteTyping = useCallback((typing: boolean) => {
    setIsTyping(typing);
  }, []);

  const sendMessage = useCallback(
    async (
      convId: string,
      content: string,
      replyToId?: string,
      onMessageSent?: (msg: Message) => void
    ): Promise<Message> => {
      // Optimistic message (shows immediately while request is in-flight)
      const optimisticId = `optimistic-${Date.now()}`;
      const optimistic: Message = {
        id: optimisticId,
        conversation_id: convId,
        sender_id: CURRENT_USER_ID,
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
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? confirmed : m))
        );
        return confirmed;
      } catch {
        // Mark as failed (keep in list with sending status for retry UX)
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? { ...m, status: "sent" as const } : m))
        );
        return optimistic;
      }
    },
    []
  );

  const editMessage = useCallback(async (convId: string, messageId: string, content: string) => {
    // Optimistic
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content, is_edited: true, edited_at: new Date().toISOString() } : m
      )
    );
    try {
      const result = await bffFetch<{ data: unknown }>(
        `/api/v1/conversations/${convId}/messages/${messageId}`,
        { method: "PATCH", body: { content } }
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? adaptMessage(result.data) : m))
      );
    } catch {
      // Optimistic stays; could show toast error in production
    }
  }, []);

  const recallMessage = useCallback(async (convId: string, messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: "", is_recalled: true } : m))
    );
    try {
      await bffFetch(
        `/api/v1/conversations/${convId}/messages/${messageId}`,
        { method: "DELETE" }
      );
    } catch {
      // optimistic stays
    }
  }, []);

  const deleteMessage = useCallback(async (convId: string, messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await bffFetch(
        `/api/v1/conversations/${convId}/messages/${messageId}?for_everyone=false`,
        { method: "DELETE" }
      );
    } catch {
      // optimistic stays
    }
  }, []);

  const pinMessage = useCallback(async (convId: string, messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_pinned: !m.is_pinned } : m))
    );
    const msg = messages.find((m) => m.id === messageId);
    const isCurrentlyPinned = msg?.is_pinned ?? false;
    try {
      if (isCurrentlyPinned) {
        await bffFetch(`/api/v1/conversations/${convId}/pinned/${messageId}`, { method: "DELETE" });
      } else {
        await bffFetch(`/api/v1/conversations/${convId}/pinned/${messageId}`, { method: "POST" });
      }
    } catch {
      // optimistic stays
    }
  }, [messages]);

  const reactToMessage = useCallback(
    async (convId: string, messageId: string, emoji: string) => {
      // Optimistic toggle
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions.find((r) => r.emoji === emoji);
          let newReactions: MessageReaction[];
          if (existing) {
            const hasReacted = existing.user_ids.includes(CURRENT_USER_ID);
            if (hasReacted) {
              const filtered = existing.user_ids.filter((id) => id !== CURRENT_USER_ID);
              newReactions = filtered.length === 0
                ? m.reactions.filter((r) => r.emoji !== emoji)
                : m.reactions.map((r) => r.emoji === emoji ? { ...r, user_ids: filtered } : r);
            } else {
              newReactions = m.reactions.map((r) =>
                r.emoji === emoji ? { ...r, user_ids: [...r.user_ids, CURRENT_USER_ID] } : r
              );
            }
          } else {
            newReactions = [...m.reactions, { emoji, user_ids: [CURRENT_USER_ID] }];
          }
          return { ...m, reactions: newReactions };
        })
      );
      try {
        await bffFetch(`/api/v1/conversations/${convId}/messages/${messageId}/reactions`, {
          method: "POST",
          body: { emoji },
        });
      } catch {
        // optimistic stays
      }
    },
    []
  );

  // Simulate AI typing + canned response (fallback when AI worker is not yet connected)
  const simulateAIReply = useCallback(
    (convId: string) => {
      setIsTyping(true);
      const delay = 1000 + Math.random() * 1500;
      const timeoutId = setTimeout(() => {
        setIsTyping(false);
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          conversation_id: convId,
          sender_id: "ai",
          content: "Tôi đã nhận được tin nhắn của bạn! Tính năng AI đang được tích hợp với AI Worker.",
          type: "text",
          status: "read",
          reactions: [],
          is_edited: false,
          is_recalled: false,
          is_pinned: false,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }, delay);
      return () => clearTimeout(timeoutId);
    },
    []
  );

  return {
    messages,
    isLoading,
    hasMore,
    isTyping,
    loadMore,
    upsertMessage,
    setRemoteTyping,
    sendMessage,
    editMessage,
    recallMessage,
    deleteMessage,
    pinMessage,
    reactToMessage,
    simulateAIReply,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useStrangerRequests
// ──────────────────────────────────────────────────────────────────────────────
export function useStrangerRequests() {
  const [requests, setRequests] = useState<StrangerRequest[]>(MOCK_STRANGER_REQUESTS);

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
      .catch(() => {
        // Keep mock data as fallback
      });
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
export function useChatSearch(conversations: Conversation[] = []) {
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
          : (c.participants.find((p) => p.user_id !== CURRENT_USER_ID)?.display_name ?? "").toLowerCase();
      const lastMsg = c.last_message?.content.toLowerCase() ?? "";
      return name.includes(q) || lastMsg.includes(q);
    });
  }, [query, conversations]);

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

