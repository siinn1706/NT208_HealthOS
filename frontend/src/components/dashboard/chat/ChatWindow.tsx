"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useMessages, useTypingState } from "@/hooks/useChat";
import { useChatWs, type WsFrame } from "@/hooks/useChatWs";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatWindowHeader } from "./ChatWindowHeader";
import { PinnedMessages } from "./PinnedMessages";
import { MessageList, type MessageListHandle } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ChatSearchBar } from "./ChatSearchBar";
import { ConversationInfoPanel } from "./ConversationInfoPanel";
import { ForwardMessageDialog } from "./ForwardMessageDialog";
import { AiQuickReplies } from "./AiQuickReplies";
import { ChatBackground } from "./ChatBackground";
import type { Conversation, Message } from "@/types/api";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const EMPTY_CONVERSATIONS: Conversation[] = [];

interface ChatWindowProps {
  conversation: Conversation;
  currentUserId: string | null;
  conversations?: Conversation[];
  onBack?: () => void;
  onPin: () => void;
  onMute: () => void;
  onDelete: () => void;
  onThemeChange: (themeId: string | null) => void;
  onMessageSent?: (msg: Message) => void;
  onIncomingMessage?: (raw: unknown) => void;
  onConversationUpdate?: (raw: unknown) => void;
}

export function ChatWindow({
  conversation,
  currentUserId,
  conversations = EMPTY_CONVERSATIONS,
  onBack,
  onPin,
  onMute,
  onDelete,
  onThemeChange,
  onMessageSent,
  onIncomingMessage,
  onConversationUpdate,
}: ChatWindowProps) {
  const t = useTranslations("chat");
  const {
    messages,
    isLoading: isLoadingMessages,
    isTyping,
    hasMore,
    loadMore,
    sendMessage,
    editMessage,
    recallMessage,
    deleteMessage,
    reactToMessage,
    pinMessage,
    simulateAIReply,
    upsertMessage,
    setPinnedState,
    setRemoteTyping,
  } = useMessages(conversation.id, currentUserId, { selfReactionLabel: t("you") });

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null);
  const messageListRef = useRef<MessageListHandle>(null);

  const convId = conversation.id;
  const wsEnabled = conversation.type !== "ai";

  const handleWsEvent = useCallback((frame: WsFrame) => {
    const payload = frame.payload as Record<string, unknown>;
    const payloadConvId = typeof payload.conversation_id === "string" ? payload.conversation_id : undefined;

    const isMessageEvent =
      frame.event === "msg:new" ||
      frame.event === "chat.message.sent" ||
      frame.event === "msg:edit" ||
      frame.event === "chat.message.edited" ||
      frame.event === "msg:delete" ||
      frame.event === "chat.message.recalled" ||
      frame.event === "msg:react" ||
      frame.event === "chat.message.reacted" ||
      frame.event === "msg:pinned" ||
      frame.event === "chat.message.pinned" ||
      frame.event === "msg:unpinned" ||
      frame.event === "chat.message.unpinned" ||
      frame.event === "msg:read" ||
      frame.event === "chat.message.read";

    if (isMessageEvent && payloadConvId && payloadConvId !== convId) {
      if (frame.event === "msg:new" || frame.event === "chat.message.sent") {
        onIncomingMessage?.(payload);
      }
      return;
    }

    if (frame.event === "msg:new" || frame.event === "chat.message.sent") {
      upsertMessage(payload);
      return;
    }

    if (frame.event === "msg:edit" || frame.event === "chat.message.edited") {
      upsertMessage(payload);
      return;
    }

    if (frame.event === "msg:delete" || frame.event === "chat.message.recalled") {
      upsertMessage(payload);
      return;
    }

    if (frame.event === "msg:react" || frame.event === "chat.message.reacted") {
      upsertMessage(payload);
      return;
    }

    if (frame.event === "msg:pinned" || frame.event === "chat.message.pinned") {
      const msgId = typeof payload.message_id === "string" ? payload.message_id : null;
      if (msgId) setPinnedState(msgId, true);
      return;
    }

    if (frame.event === "msg:unpinned" || frame.event === "chat.message.unpinned") {
      const msgId = typeof payload.message_id === "string" ? payload.message_id : null;
      if (msgId) setPinnedState(msgId, false);
      return;
    }

    if (frame.event === "msg:read" || frame.event === "chat.message.read") {
      // No-op: read receipts don't require visual message state changes currently
      return;
    }

    if (frame.event === "typing" || frame.event === "chat.typing") {
      if (payloadConvId && payloadConvId !== convId) return;
      const senderId = typeof payload.user_id === "string" ? payload.user_id : null;
      if (!senderId || senderId === currentUserId) return;
      const typing = Boolean(payload.is_typing);
      setRemoteTyping(typing);
    }

    if (frame.event === "conversation.updated") {
      onConversationUpdate?.(payload);
    }
  }, [convId, upsertMessage, setPinnedState, setRemoteTyping, onIncomingMessage, onConversationUpdate, currentUserId]);

  const { sendEvent, isConnected } = useChatWs({
    onEvent: handleWsEvent,
    enabled: wsEnabled,
  });

  useEffect(() => {
    if (!wsEnabled || !isConnected) return;
    const conversationIds = Array.from(
      new Set(
        conversations
          .map((item) => item.id)
          .filter((id) => /^[0-9a-fA-F-]{36}$/.test(id))
      )
    );
    for (const id of conversationIds) {
      sendEvent("conv:join", { conversation_id: id });
    }
  }, [wsEnabled, isConnected, sendEvent, convId, conversations]);

  const { onKeyPress } = useTypingState(convId, sendEvent);

  const handleSend = useCallback(
    (content: string) => {
      if (editingMessage) {
        editMessage(convId, editingMessage.id, content);
        setEditingMessage(null);
      } else {
        void sendMessage(convId, content, replyTo?.id, onMessageSent).catch((error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : "Cannot send message right now. Please try again.";
          toast.error(message);
        });
        setReplyTo(null);
        messageListRef.current?.scrollToBottom();
        if (conversation.type === "ai") {
          simulateAIReply(convId, t("aiIntegrationNote"));
        }
      }
    },
    [
      editingMessage,
      replyTo,
      conversation.type,
      convId,
      sendMessage,
      editMessage,
      simulateAIReply,
      onMessageSent,
      t,
    ]
  );

  const handleReply = useCallback((msg: Message) => {
    setEditingMessage(null);
    setReplyTo(msg);
  }, []);

  const handleEdit = useCallback((msg: Message) => {
    setReplyTo(null);
    setEditingMessage(msg);
  }, []);

  const handleCancelReply = useCallback(() => setReplyTo(null), []);
  const handleCancelEdit = useCallback(() => setEditingMessage(null), []);

  // Keyboard shortcut: Escape cancels reply/edit mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingMessage) {
          handleCancelEdit();
        } else if (replyTo) {
          handleCancelReply();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editingMessage, replyTo, handleCancelEdit, handleCancelReply]);

  // Bind conversationId so MessageList/PinnedMessages get simple (msgId) callbacks
  const handleRecall = useCallback((msgId: string) => recallMessage(convId, msgId), [convId, recallMessage]);
  const handleDelete = useCallback((msgId: string) => deleteMessage(convId, msgId), [convId, deleteMessage]);
  const handlePin = useCallback((msgId: string) => pinMessage(convId, msgId), [convId, pinMessage]);
  const handleReact = useCallback((msgId: string, emoji: string) => reactToMessage(convId, msgId, emoji), [convId, reactToMessage]);

  const handleJump = useCallback((msgId: string) => {
    messageListRef.current?.jumpToMessage(msgId);
  }, []);

  const handleForward = useCallback((msg: Message) => {
    setForwardTarget(msg);
  }, []);

  const handleDoForward = useCallback(
    (targetConvId: string, msg: Message) => {
      sendMessage(targetConvId, msg.content, undefined, undefined);
    },
    [sendMessage]
  );

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.is_pinned && !m.is_recalled),
    [messages]
  );
  const participantNameById = useMemo(
    () =>
      conversation.participants.reduce<Record<string, string>>((acc, participant) => {
        acc[participant.user_id] = participant.display_name;
        return acc;
      }, {}),
    [conversation.participants]
  );

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <ChatBackground themeId={conversation.theme_id} />

      <div className="relative z-10 flex flex-col h-full">
        <ChatWindowHeader
          conversation={conversation}
          currentUserId={currentUserId}
          onBack={onBack}
          onPin={onPin}
          onMute={onMute}
          onDelete={onDelete}
          onThemeChange={onThemeChange}
          onSearch={() => setShowSearch((s) => !s)}
          onInfoOpen={() => setShowInfo(true)}
        />

        {/* In-conversation search bar */}
        {showSearch && (
          <ChatSearchBar
            messages={messages}
            onClose={() => setShowSearch(false)}
            onJumpToMessage={handleJump}
          />
        )}

        {pinnedMessages.length > 0 && (
          <PinnedMessages
            messages={pinnedMessages}
            currentUserId={currentUserId}
            participantNameById={participantNameById}
            onJump={handleJump}
          />
        )}

        {isLoadingMessages ? (
          <div className="flex-1 flex flex-col justify-end gap-2.5 px-4 pb-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${i % 3 === 0 ? "flex-row-reverse" : ""}`}
              >
                <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                <Skeleton
                  className="h-9 rounded-2xl"
                  style={{ width: `${40 + (i * 13) % 35}%` }}
                />
              </div>
            ))}
          </div>
        ) : (
          <MessageList
            ref={messageListRef}
            conversationId={conversation.id}
            messages={messages}
            currentUserId={currentUserId}
            participantNameById={participantNameById}
            isTyping={isTyping}
            hasMore={hasMore}
            loadMore={loadMore}
            onReply={handleReply}
            onEdit={handleEdit}
            onRecall={handleRecall}
            onDelete={handleDelete}
            onReact={handleReact}
            onPin={handlePin}
            onForward={handleForward}
            onJumpToReply={handleJump}
          />
        )}

        {/* AI quick replies */}
        {conversation.type === "ai" && !replyTo && !editingMessage && (
          <AiQuickReplies onSelect={handleSend} disabled={isTyping} />
        )}

        <MessageInput
          replyTo={replyTo}
          currentUserId={currentUserId}
          editingMessage={editingMessage}
          onSend={handleSend}
          onCancelReply={handleCancelReply}
          onCancelEdit={handleCancelEdit}
          onKeyPress={onKeyPress}
          disabled={conversation.type === "ai" && isTyping}
        />
      </div>

      {/* Conversation info panel — lazy-mounted to avoid filtering all messages when closed */}
      {showInfo && (
        <ConversationInfoPanel
          open={showInfo}
          onOpenChange={setShowInfo}
          conversation={conversation}
          currentUserId={currentUserId}
          messages={messages}
        />
      )}

      {/* Forward message dialog — lazy-mounted */}
      {forwardTarget && (
        <ForwardMessageDialog
          open={!!forwardTarget}
          onOpenChange={(open) => { if (!open) setForwardTarget(null); }}
          message={forwardTarget}
          conversations={conversations}
          onForward={handleDoForward}
        />
      )}
    </div>
  );
}
