"use client";

/**
 * useChat — centralised state for the entire chat feature.
 * All mutations are mock-only; swap the internals for real API calls when BE is ready.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_STRANGER_REQUESTS,
  CURRENT_USER_ID,
  getAIResponse,
} from "@/data/chat";
import type {
  Conversation,
  Message,
  StrangerRequest,
  MessageReaction,
} from "@/types/api";

// ─── useConversations ─────────────────────────────────────────────────
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);

  const sortedConversations = useMemo(() => [...conversations].sort((a, b) => {
    // AI always first
    if (a.type === "ai") return -1;
    if (b.type === "ai") return 1;
    // Pinned next
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    // Then by latest message
    const aTime = a.last_message?.created_at ?? a.updated_at;
    const bTime = b.last_message?.created_at ?? b.updated_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  }), [conversations]);

  const pinConversation = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_pinned: !c.is_pinned } : c))
    );
  }, []);

  const muteConversation = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_muted: !c.is_muted } : c))
    );
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const setTheme = useCallback((id: string, themeId: string | null) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, theme_id: themeId } : c))
    );
  }, []);

  const markAsRead = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
  }, []);

  const updateLastMessage = useCallback(
    (conversationId: string, message: Message) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                last_message: {
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

  const createConversation = useCallback((newConv: Conversation) => {
    setConversations((prev) => [newConv, ...prev]);
  }, []);

  return {
    conversations: sortedConversations,
    pinConversation,
    muteConversation,
    deleteConversation,
    setTheme,
    markAsRead,
    updateLastMessage,
    createConversation,
  };
}

// ─── useMessages ──────────────────────────────────────────────────────
export function useMessages(conversationId: string | null) {
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(
    MOCK_MESSAGES
  );
  const [isTyping, setIsTyping] = useState(false);

  // Stable ref to latest messagesMap — lets sendMessage stay dependency-free
  const messagesMapRef = useRef(messagesMap);
  useEffect(() => { messagesMapRef.current = messagesMap; }, [messagesMap]);

  const messages: Message[] = conversationId ? (messagesMap[conversationId] ?? []) : [];

  const sendMessage = useCallback(
    (
      conversationId: string,
      content: string,
      replyToId?: string,
      onMessageSent?: (msg: Message) => void
    ): Message => {
      const replyTo = replyToId
        ? messagesMapRef.current[conversationId]?.find((m) => m.id === replyToId)
        : undefined;

      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: CURRENT_USER_ID,
        content,
        type: "text",
        status: "sent",
        reply_to: replyTo
          ? { id: replyTo.id, content: replyTo.content, sender_id: replyTo.sender_id, type: replyTo.type }
          : undefined,
        reactions: [],
        is_edited: false,
        is_recalled: false,
        is_pinned: false,
        created_at: new Date().toISOString(),
      };

      setMessagesMap((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), newMsg],
      }));

      onMessageSent?.(newMsg);
      return newMsg;
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const editMessage = useCallback((conversationId: string, messageId: string, content: string) => {
    setMessagesMap((prev) => ({
      ...prev,
      [conversationId]: prev[conversationId]?.map((m) =>
        m.id === messageId
          ? { ...m, content, is_edited: true, edited_at: new Date().toISOString() }
          : m
      ) ?? [],
    }));
  }, []);

  const recallMessage = useCallback((conversationId: string, messageId: string) => {
    setMessagesMap((prev) => ({
      ...prev,
      [conversationId]: prev[conversationId]?.map((m) =>
        m.id === messageId ? { ...m, content: "", is_recalled: true } : m
      ) ?? [],
    }));
  }, []);

  const deleteMessage = useCallback((conversationId: string, messageId: string) => {
    setMessagesMap((prev) => ({
      ...prev,
      [conversationId]: prev[conversationId]?.filter((m) => m.id !== messageId) ?? [],
    }));
  }, []);

  const pinMessage = useCallback((conversationId: string, messageId: string) => {
    setMessagesMap((prev) => ({
      ...prev,
      [conversationId]: prev[conversationId]?.map((m) =>
        m.id === messageId ? { ...m, is_pinned: !m.is_pinned } : m
      ) ?? [],
    }));
  }, []);

  const reactToMessage = useCallback(
    (conversationId: string, messageId: string, emoji: string) => {
      setMessagesMap((prev) => ({
        ...prev,
        [conversationId]: prev[conversationId]?.map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions.find((r) => r.emoji === emoji);
          let newReactions: MessageReaction[];
          if (existing) {
            const hasReacted = existing.user_ids.includes(CURRENT_USER_ID);
            if (hasReacted) {
              // toggle off
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
        }) ?? [],
      }));
    },
    []
  );

  const addAIResponse = useCallback((conversationId: string, content: string) => {
    const aiMsg: Message = {
      id: `ai-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: "ai",
      content,
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: new Date().toISOString(),
    };
    setMessagesMap((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), aiMsg],
    }));
    return aiMsg;
  }, []);

  // Simulate AI typing + response
  const simulateAIReply = useCallback(
    (conversationId: string) => {
      setIsTyping(true);
      const delay = 1000 + Math.random() * 1500;
      const timeoutId = setTimeout(() => {
        setIsTyping(false);
        addAIResponse(conversationId, getAIResponse());
      }, delay);
      return () => clearTimeout(timeoutId);
    },
    [addAIResponse]
  );

  return {
    messages,
    isTyping,
    sendMessage,
    editMessage,
    recallMessage,
    deleteMessage,
    pinMessage,
    reactToMessage,
    simulateAIReply,
  };
}

// ─── useStrangerRequests ──────────────────────────────────────────────
export function useStrangerRequests() {
  const [requests, setRequests] = useState<StrangerRequest[]>(MOCK_STRANGER_REQUESTS);

  const pendingRequests = requests.filter((r) => r.status === "pending");

  const acceptRequest = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "accepted" } : r))
    );
    // In real impl: create conversation, move to main list
  }, []);

  const rejectRequest = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r))
    );
  }, []);

  const blockRequest = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "blocked" } : r))
    );
  }, []);

  return { requests, pendingRequests, acceptRequest, rejectRequest, blockRequest };
}

// ─── useChatSearch ────────────────────────────────────────────────────
export function useChatSearch() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return MOCK_CONVERSATIONS.filter((c) => {
      const name =
        c.type === "ai"
          ? "healthos ai assistant"
          : c.type === "group"
          ? (c.name ?? "").toLowerCase()
          : (c.participants.find((p) => p.user_id !== CURRENT_USER_ID)?.display_name ?? "").toLowerCase();
      const lastMsg = c.last_message?.content.toLowerCase() ?? "";
      return name.includes(q) || lastMsg.includes(q);
    });
  }, [query]);

  return { query, setQuery, filtered };
}

// ─── useTypingState ───────────────────────────────────────────────────
export function useTypingState() {
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onKeyPress = useCallback(() => {
    setIsTypingLocal(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setIsTypingLocal(false), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  return { isTypingLocal, onKeyPress };
}
