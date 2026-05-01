"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useMessages, useTypingState, findAiBotUserId } from "@/hooks/useChat";
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
import { ConnectionStatusBanner } from "./ConnectionStatusBanner";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOutboundQueue, type OutboundItem } from "@/hooks/useOutboundQueue";
import type { Conversation, Message } from "@/types/api";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { track } from "@/lib/analytics";

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
    streamingAssistantId,
    hasMore,
    loadMore,
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
    reactToMessage,
    pinMessage,
    upsertMessage,
    setPinnedState,
    setRemoteTyping,
    onAiStreamStarted,
    onAiStreamChunk,
    onAiStreamCompleted,
    refetchActiveConversation,
  } = useMessages(conversation.id, currentUserId, {
    selfReactionLabel: t("you"),
    conversationType: conversation.type,
  });

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null);
  const messageListRef = useRef<MessageListHandle>(null);

  const convId = conversation.id;
  // Human chat remains WS-driven. AI sends go through the BFF SSE route,
  // while this socket stays enabled so existing realtime events and
  // reconnect-driven backfills continue to work without regressions.
  const wsEnabled = true;

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

    // ── AI streaming events ────────────────────────────────────────────────
    if (frame.event === "ai:started" || frame.event === "chat.message.ai_started") {
      if (payloadConvId && payloadConvId !== convId) return;
      onAiStreamStarted({
        message_id: typeof payload.message_id === "string" ? payload.message_id : undefined,
        conversation_id: payloadConvId,
        sender_id: typeof payload.sender_id === "string" ? payload.sender_id : undefined,
      });
      return;
    }

    if (frame.event === "ai:chunk" || frame.event === "chat.message.ai_chunk") {
      if (payloadConvId && payloadConvId !== convId) return;
      onAiStreamChunk({
        message_id: typeof payload.message_id === "string" ? payload.message_id : undefined,
        delta: typeof payload.delta === "string" ? payload.delta : undefined,
      });
      return;
    }

    if (frame.event === "ai:completed" || frame.event === "chat.message.ai_completed") {
      if (payloadConvId && payloadConvId !== convId) return;
      onAiStreamCompleted(payload);
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
  }, [
    convId,
    upsertMessage,
    setPinnedState,
    setRemoteTyping,
    onIncomingMessage,
    onConversationUpdate,
    currentUserId,
    onAiStreamStarted,
    onAiStreamChunk,
    onAiStreamCompleted,
  ]);

  const {
    sendEvent,
    isConnected,
    sessionExpired,
    isReconnecting,
    reconnectNow,
  } = useChatWs({
    onEvent: handleWsEvent,
    enabled: wsEnabled,
    // After a transient WS drop, refetch the active conversation so any AI
    // bot reply that completed while we were offline replaces the stuck
    // `streaming` placeholder with the final DB row (FE review C6).
    onReconnect: refetchActiveConversation,
  });

  const isOnline = useOnlineStatus();

  const { queued: queuedItems, enqueue: enqueueOutbound, remove: removeOutbound, flush: flushOutbound } =
    useOutboundQueue(convId, {
      onEvicted: (count) => {
        toast.warning(t("queue.evictedTitle"), {
          description: t("queue.evictedDescription", { n: count }),
        });
      },
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
        return;
      }

      // Offline branch: don't even attempt the network call. Stage a `queued`
      // optimistic bubble locally and persist it to IndexedDB so it survives
      // reload. The reconnect effect below will drain it.
      if (!isOnline || (wsEnabled && !isConnected)) {
        const optimistic = enqueueOptimisticMessage(convId, content, replyTo?.id);
        if (optimistic) {
          void enqueueOutbound({
            client_message_id: optimistic.id,
            conversation_id: convId,
            content,
            reply_to_id: replyTo?.id ?? null,
          });
          track("chat.message.queued", { conversation_id: convId, reason: !isOnline ? "offline" : "ws_down" });
          onMessageSent?.(optimistic);
        }
        setReplyTo(null);
        messageListRef.current?.scrollToBottom();
        return;
      }

      // B7 P6 — AI conversations stream over SSE. Skips the WS / queue paths;
      // each "send" is a fresh request/response and AI replies arrive inline.
      if (conversation.type === "ai") {
        void streamAiMessage(convId, content)
          .then((sent) => {
            if (sent) onMessageSent?.(sent);
          })
          .catch((error: unknown) => {
            const message =
              error instanceof Error
                ? error.message
                : "Cannot send AI message right now. Please try again.";
            toast.error(message);
          });
        setReplyTo(null);
        messageListRef.current?.scrollToBottom();
        return;
      }

      void sendMessage(convId, content, replyTo?.id, onMessageSent)
        .then((result) => {
          // The send already happened (and either succeeded or hit a 4xx/5xx).
          // Only network-class failures get parked in the durable queue —
          // 422/429 are user-actionable and stay in `failed` so the user sees
          // a Retry button with the right reason chip.
          if (result.status === "failed" && result.error_code === "network") {
            void enqueueOutbound({
              client_message_id: result.id,
              conversation_id: convId,
              content,
              reply_to_id: replyTo?.id ?? null,
            });
            markMessageQueued(result.id);
            track("chat.message.queued", { conversation_id: convId, reason: "network_after_send" });
          } else if (result.status === "failed") {
            track("chat.message.failed", {
              conversation_id: convId,
              error_code: result.error_code ?? "unknown",
            });
          } else {
            track("chat.message.sent", { conversation_id: convId });
          }
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : "Cannot send message right now. Please try again.";
          toast.error(message);
        });
      setReplyTo(null);
      messageListRef.current?.scrollToBottom();
    },
    [
      editingMessage,
      replyTo,
      convId,
      conversation.type,
      sendMessage,
      streamAiMessage,
      editMessage,
      onMessageSent,
      isOnline,
      isConnected,
      wsEnabled,
      enqueueOptimisticMessage,
      enqueueOutbound,
      markMessageQueued,
    ]
  );

  const handleRetry = useCallback((msgId: string) => {
    // Manual retry always wins over the automatic queue drain — drop the
    // queue entry so we don't try to send the same payload twice and
    // delegate to useChat which already handles fresh optimistic IDs.
    void removeOutbound(msgId);
    track("chat.message.retried", { conversation_id: convId });
    void retryMessage(msgId);
  }, [retryMessage, removeOutbound, convId]);

  const handleDiscard = useCallback((msgId: string) => {
    void removeOutbound(msgId);
    track("chat.message.discarded", { conversation_id: convId });
    discardMessage(msgId);
  }, [discardMessage, removeOutbound, convId]);

  // Auto-flush queued messages once the connection comes back. Guarded by
  // both `isOnline` and `isConnected` so we don't burn battery flushing into
  // a still-degraded socket.
  const lastFlushKeyRef = useRef<string>("");
  useEffect(() => {
    if (!isOnline) return;
    if (wsEnabled && !isConnected) return;
    if (queuedItems.length === 0) return;

    // Cheap dedupe: only flush when the (conv, count, head id) tuple changes.
    // Prevents re-entrant flushes when WS bounces during a slow drain.
    const key = `${convId}:${queuedItems.length}:${queuedItems[0]?.client_message_id ?? ""}`;
    if (lastFlushKeyRef.current === key) return;
    lastFlushKeyRef.current = key;

    void flushOutbound(async (item: OutboundItem) => {
      try {
        // The original `queued` bubble was synthesised by
        // `enqueueOptimisticMessage` and is still in the message list. Discard
        // it FIRST so `sendMessage` (which always creates a fresh
        // `optimistic-${uuid}` row) doesn't leave us rendering two bubbles for
        // the same payload. If the resend fails we'll re-enqueue below, and
        // either way the message reappears with up-to-date status.
        discardMessage(item.client_message_id);
        const result = await sendMessage(
          item.conversation_id,
          item.content,
          item.reply_to_id ?? undefined
        );
        if (result.status === "failed") {
          if (result.error_code === "network") {
            // Network failure on resend — re-enqueue the (still-failed) row so
            // the next reconnect tries again. We swap the IDB key over to the
            // freshly-minted optimistic id so future retries stay aligned.
            void enqueueOutbound({
              client_message_id: result.id,
              conversation_id: item.conversation_id,
              content: item.content,
              reply_to_id: item.reply_to_id ?? null,
            });
            markMessageQueued(result.id);
            return true;
          }
          // Hard failure (validation / rate-limit) — `sendMessage` already
          // flipped the new optimistic row into `failed`; remove from the
          // durable queue so it stops auto-retrying. The user can hit Retry.
          return true;
        }
        return true;
      } catch {
        // The original was already discarded above; do NOT mark "remove from
        // queue" so the next render's effect can try the send again.
        return false;
      }
    }).then(({ sent, failed }) => {
      if (sent > 0) {
        track("chat.queue.flushed", { conversation_id: convId, sent, failed });
      }
    });
  }, [
    isOnline,
    isConnected,
    wsEnabled,
    queuedItems,
    convId,
    flushOutbound,
    sendMessage,
    discardMessage,
    enqueueOutbound,
    markMessageQueued,
  ]);

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
  const aiBotUserId = useMemo(
    () => findAiBotUserId(conversation.participants),
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

        {wsEnabled && (
          <ConnectionStatusBanner
            isOnline={isOnline}
            isReconnecting={isReconnecting}
            sessionExpired={sessionExpired}
            onReconnect={reconnectNow}
          />
        )}

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
            aiBotUserId={aiBotUserId}
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
            onRetry={handleRetry}
            onDiscard={handleDiscard}
          />
        )}

        {/* AI quick replies */}
        {conversation.type === "ai" && !replyTo && !editingMessage && (
          <AiQuickReplies onSelect={handleSend} disabled={isTyping} />
        )}

        {/* B7 P6 — Stop generation control. Surfaces while an AI stream is in flight. */}
        {conversation.type === "ai" && streamingAssistantId && (
          <div className="px-3 pb-2 flex justify-center">
            <button
              type="button"
              onClick={stopStreaming}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={t("stopGeneration")}
            >
              <span className="h-2 w-2 rounded-sm bg-foreground" aria-hidden="true" />
              {t("stopGeneration")}
            </button>
          </div>
        )}

        <MessageInput
          conversationId={convId}
          replyTo={replyTo}
          currentUserId={currentUserId}
          editingMessage={editingMessage}
          onSend={handleSend}
          onCancelReply={handleCancelReply}
          onCancelEdit={handleCancelEdit}
          onKeyPress={onKeyPress}
          disabled={conversation.type === "ai" && Boolean(streamingAssistantId)}
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
