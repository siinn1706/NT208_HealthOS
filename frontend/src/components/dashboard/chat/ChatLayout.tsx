"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { CHAT_REALTIME_EVENT, useConversations, useStrangerRequests } from "@/hooks/useChat";
import type { WsFrame } from "@/hooks/useChatWs";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { ChatEmptyState } from "./ChatEmptyState";
import type { Message } from "@/types/api";
import { cn } from "@/lib/utils";

interface ChatLayoutProps {
  initialCurrentUserId?: string | null;
}

const SERVER_MESSAGE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ChatLayout({ initialCurrentUserId = null }: ChatLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const prefersReduced = useReducedMotion();
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialCurrentUserId);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/auth/session", { cache: "no-store", credentials: "same-origin" })
      .then(async (res) => {
        const body = res.ok ? await res.json().catch(() => null) : null;
        return body;
      })
      .then((json) => {
        if (cancelled) return;
        const userId = json?.data?.user_id ?? json?.data?.id;
        if (typeof userId === "string" && userId.trim()) {
          setCurrentUserId(userId);
        }
      })
      .catch(() => {
        // Keep the server-validated id if a transient tunnel/session fetch fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Derive activeId from URL: /{locale}/dashboard/chat/{conversationId} */
  const basePath = `/${locale}/dashboard/chat`;
  const activeId = pathname.startsWith(basePath + "/")
    ? pathname.slice(basePath.length + 1).split("/")[0] || null
    : null;
  const isMobileConvOpen = !!activeId;

  const {
    conversations,
    isLoading,
    pinConversation,
    muteConversation,
    deleteConversation,
    setTheme,
    markAsRead,
    updateLastMessage,
    applyIncomingMessage,
    applyUserStatus,
    upsertConversation,
    createConversation,
    createGroup,
    addGroupMembers,
    removeGroupMember,
    leaveGroup,
    setMemberRole,
    transferOwnership,
    refetchConversations,
  } = useConversations();

  // Refetch conversation list when coming back online so offline-missed WS
  // fanout events (e.g. new group membership, last-message updates) are synced.
  const isOnline = useOnlineStatus();
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (!prevOnlineRef.current && isOnline) {
      void refetchConversations();
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, refetchConversations]);

  const { pendingRequests, acceptRequest, rejectRequest, blockRequest } = useStrangerRequests();

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId]
  );
  const activeLastMessageId = activeConversation?.last_message?.id;
  const lastMarkedReadRef = useRef<string | null>(null);

  const markVisibleConversationRead = useCallback(
    (conversationId: string | null, lastMessageId?: string) => {
      if (!conversationId || !lastMessageId) return;
      if (!SERVER_MESSAGE_ID_RE.test(lastMessageId)) return;
      const key = `${conversationId}:${lastMessageId}`;
      if (lastMarkedReadRef.current === key) return;
      lastMarkedReadRef.current = key;
      void markAsRead(conversationId, lastMessageId);
    },
    [markAsRead]
  );

  useEffect(() => {
    if (!activeId || !activeLastMessageId) return;
    const id = window.setTimeout(() => {
      markVisibleConversationRead(activeId, activeLastMessageId);
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeId, activeLastMessageId, markVisibleConversationRead]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      const selected = conversations.find((conversation) => conversation.id === id);
      router.push(`${basePath}/${id}`);
      markVisibleConversationRead(id, selected?.last_message?.id);
    },
    [router, basePath, markVisibleConversationRead, conversations]
  );

  const handleBack = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  const handleCreateConversation = useCallback(
    async (targetUserId: string) => {
      const created = await createConversation(targetUserId);
      if (created) {
        upsertConversation(created);
      }
      return created;
    },
    [createConversation, upsertConversation]
  );

  const handleCreateGroup = useCallback(
    async (title: string, memberIds: string[]) => {
      const created = await createGroup(title, memberIds);
      if (created) {
        upsertConversation(created);
      }
      return created;
    },
    [createGroup, upsertConversation]
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation(id);
      if (activeId === id) router.push(basePath);
    },
    [deleteConversation, activeId, router, basePath]
  );

  const handleLeaveGroup = useCallback(
    async (convId: string) => {
      const ok = await leaveGroup(convId);
      if (ok && activeId === convId) router.push(basePath);
      return ok;
    },
    [leaveGroup, activeId, router, basePath]
  );

  // Stable callbacks scoped to the active conversation
  const activeConvId = activeConversation?.id;
  const handlePinActive = useCallback(
    () => { if (activeConvId) pinConversation(activeConvId); },
    [activeConvId, pinConversation]
  );
  const handleMuteActive = useCallback(
    () => { if (activeConvId) muteConversation(activeConvId); },
    [activeConvId, muteConversation]
  );
  const handleDeleteActive = useCallback(
    () => { if (activeConvId) handleDeleteConversation(activeConvId); },
    [activeConvId, handleDeleteConversation]
  );
  const handleThemeChange = useCallback(
    (themeId: string | null) => { if (activeConvId) setTheme(activeConvId, themeId); },
    [activeConvId, setTheme]
  );
  const handleMessageSent = useCallback(
    (msg: Message) => { if (activeConvId) updateLastMessage(activeConvId, msg); },
    [activeConvId, updateLastMessage]
  );

  const handleConversationUpdate = useCallback(
    (raw: unknown) => { upsertConversation(raw); },
    [upsertConversation]
  );

  const handleIncomingMessage = useCallback(
    (raw: unknown) => applyIncomingMessage(raw, activeId),
    [applyIncomingMessage, activeId]
  );

  useEffect(() => {
    const handleRealtimeEvent = (event: Event) => {
      const frame = (event as CustomEvent<WsFrame>).detail;
      if (!frame || typeof frame.event !== "string") return;
      const payload = frame.payload;
      if (frame.event === "msg:new" || frame.event === "chat.message.sent") {
        applyIncomingMessage(payload, activeId);
        return;
      }
      if (frame.event === "conversation.updated" || frame.event === "chat.conversation.updated") {
        upsertConversation(payload);
        return;
      }
      if (frame.event === "user.status") {
        applyUserStatus(payload);
      }
    };
    window.addEventListener(CHAT_REALTIME_EVENT, handleRealtimeEvent);
    return () => window.removeEventListener(CHAT_REALTIME_EVENT, handleRealtimeEvent);
  }, [activeId, applyIncomingMessage, applyUserStatus, upsertConversation]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background">
      {/* ── Conversation list panel ── */}
      <div
        className={cn(
          "flex-shrink-0 border-r border-border bg-background h-full overflow-hidden",
          "w-full md:w-80",
          isMobileConvOpen
            ? "hidden md:flex md:flex-col"
            : "flex flex-col"
        )}
      >
        <ConversationList
          conversations={conversations}
          currentUserId={currentUserId}
          activeId={activeId}
          strangerRequests={pendingRequests}
          isLoading={isLoading}
          onSelectConversation={handleSelectConversation}
          onPinConversation={pinConversation}
          onMuteConversation={muteConversation}
          onDeleteConversation={handleDeleteConversation}
          onAcceptStranger={acceptRequest}
          onRejectStranger={rejectRequest}
          onBlockStranger={blockRequest}
          onCreateConversation={handleCreateConversation}
          onCreateGroup={handleCreateGroup}
        />
      </div>

      {/* ── Chat window panel ── */}
      <div
        className={cn(
          "flex-1 min-w-0 h-full overflow-hidden",
          isMobileConvOpen
            ? "flex flex-col"
            : "hidden md:flex md:flex-col"
        )}
      >
        <AnimatePresence>
          {activeConversation ? (
            <motion.div
              key="active-pane"
              className="flex flex-col h-full"
              initial={{ opacity: prefersReduced ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: prefersReduced ? 1 : 0 }}
              transition={{ duration: prefersReduced ? 0 : 0.15, ease: "easeOut" }}
            >
              <ChatWindow
                conversation={activeConversation}
                currentUserId={currentUserId}
                conversations={conversations}
                onBack={handleBack}
                onPin={handlePinActive}
                onMute={handleMuteActive}
                onDelete={handleDeleteActive}
                onThemeChange={handleThemeChange}
                onMessageSent={handleMessageSent}
                onIncomingMessage={handleIncomingMessage}
                onConversationUpdate={handleConversationUpdate}
                onUserStatus={applyUserStatus}
                onLeaveGroup={handleLeaveGroup}
                onAddGroupMembers={addGroupMembers}
                onRemoveGroupMember={removeGroupMember}
                onPromoteGroupMember={(convId, uid) => setMemberRole(convId, uid, "admin")}
                onDemoteGroupMember={(convId, uid) => setMemberRole(convId, uid, "member")}
                onTransferGroupOwnership={transferOwnership}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="flex-1 flex items-center justify-center"
              initial={{ opacity: prefersReduced ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: prefersReduced ? 1 : 0 }}
              transition={{ duration: prefersReduced ? 0 : 0.15 }}
            >
              <ChatEmptyState />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
