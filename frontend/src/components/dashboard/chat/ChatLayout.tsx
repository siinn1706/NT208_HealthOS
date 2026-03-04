"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { useConversations, useStrangerRequests } from "@/hooks/useChat";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { ChatEmptyState } from "./ChatEmptyState";
import type { Message } from "@/types/api";
import { cn } from "@/lib/utils";

export function ChatLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  /* Derive activeId from URL: /{locale}/dashboard/chat/{conversationId} */
  const basePath = `/${locale}/dashboard/chat`;
  const activeId = pathname.startsWith(basePath + "/")
    ? pathname.slice(basePath.length + 1).split("/")[0] || null
    : null;
  const isMobileConvOpen = !!activeId;

  const {
    conversations,
    pinConversation,
    muteConversation,
    deleteConversation,
    setTheme,
    markAsRead,
    updateLastMessage,
    applyIncomingMessage,
    upsertConversation,
    createConversation,
  } = useConversations();

  const { requests, acceptRequest, rejectRequest, blockRequest } = useStrangerRequests();

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId]
  );

  const handleSelectConversation = useCallback(
    (id: string) => {
      router.push(`${basePath}/${id}`);
      markAsRead(id);
    },
    [router, basePath, markAsRead]
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

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation(id);
      if (activeId === id) router.push(basePath);
    },
    [deleteConversation, activeId, router, basePath]
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
          activeId={activeId}
          strangerRequests={requests}
          onSelectConversation={handleSelectConversation}
          onPinConversation={pinConversation}
          onMuteConversation={muteConversation}
          onDeleteConversation={handleDeleteConversation}
          onAcceptStranger={acceptRequest}
          onRejectStranger={rejectRequest}
          onBlockStranger={blockRequest}
          onCreateConversation={handleCreateConversation}
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
              key={activeConversation.id}
              className="flex flex-col h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <ChatWindow
                conversation={activeConversation}
                conversations={conversations}
                onBack={handleBack}
                onPin={handlePinActive}
                onMute={handleMuteActive}
                onDelete={handleDeleteActive}
                onThemeChange={handleThemeChange}
                onMessageSent={handleMessageSent}
                onIncomingMessage={(raw) => applyIncomingMessage(raw, activeId)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="flex-1 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChatEmptyState />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
