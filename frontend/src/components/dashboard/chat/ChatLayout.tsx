"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { useConversations, useStrangerRequests } from "@/hooks/useChat";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { ChatEmptyState } from "./ChatEmptyState";
import type { Conversation } from "@/types/api";
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
    createConversation,
  } = useConversations();

  const { requests, acceptRequest, rejectRequest, blockRequest } = useStrangerRequests();

  const activeConversation: Conversation | undefined = conversations.find((c) => c.id === activeId);

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
    (conv: Conversation) => {
      createConversation(conv);
      handleSelectConversation(conv.id);
    },
    [createConversation, handleSelectConversation]
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation(id);
      if (activeId === id) router.push(basePath);
    },
    [deleteConversation, activeId, router, basePath]
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
                onPin={() => pinConversation(activeConversation.id)}
                onMute={() => muteConversation(activeConversation.id)}
                onDelete={() => handleDeleteConversation(activeConversation.id)}
                onThemeChange={(themeId) => setTheme(activeConversation.id, themeId)}
                onMessageSent={(msg) => updateLastMessage(activeConversation.id, msg)}
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
