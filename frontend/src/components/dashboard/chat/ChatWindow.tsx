"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useMessages, useTypingState } from "@/hooks/useChat";
import { useChatWs, type WsFrame } from "@/hooks/useChatWs";
import { ChatWindowHeader } from "./ChatWindowHeader";
import { PinnedMessages } from "./PinnedMessages";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ChatSearchBar } from "./ChatSearchBar";
import { ConversationInfoPanel } from "./ConversationInfoPanel";
import { ForwardMessageDialog } from "./ForwardMessageDialog";
import { AiQuickReplies } from "./AiQuickReplies";
import { ChatBackground } from "./ChatBackground";
import { CURRENT_USER_ID } from "@/data/chat";
import type { Conversation, Message } from "@/types/api";

interface ChatWindowProps {
  conversation: Conversation;
  conversations?: Conversation[];
  onBack?: () => void;
  onPin: () => void;
  onMute: () => void;
  onDelete: () => void;
  onThemeChange: (themeId: string | null) => void;
  onMessageSent?: (msg: Message) => void;
  onIncomingMessage?: (raw: unknown) => void;
}

export function ChatWindow({
  conversation,
  conversations = [],
  onBack,
  onPin,
  onMute,
  onDelete,
  onThemeChange,
  onMessageSent,
  onIncomingMessage,
}: ChatWindowProps) {
  const {
    messages,
    isTyping,
    sendMessage,
    editMessage,
    recallMessage,
    deleteMessage,
    reactToMessage,
    pinMessage,
    simulateAIReply,
    upsertMessage,
    setRemoteTyping,
  } = useMessages(conversation.id);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null);

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
      frame.event === "chat.message.reacted";

    if (isMessageEvent && payloadConvId && payloadConvId !== convId) {
      onIncomingMessage?.(payload);
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

    if (frame.event === "typing" || frame.event === "chat.typing") {
      if (payloadConvId && payloadConvId !== convId) return;
      const senderId = typeof payload.user_id === "string" ? payload.user_id : null;
      if (!senderId || senderId === CURRENT_USER_ID) return;
      const typing = Boolean(payload.is_typing);
      setRemoteTyping(typing);
    }
  }, [convId, upsertMessage, setRemoteTyping, onIncomingMessage]);

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
        const sent = sendMessage(convId, content, replyTo?.id, onMessageSent);
        void sent;
        setReplyTo(null);
        if (conversation.type === "ai") {
          simulateAIReply(convId);
        }
      }
    },
    [editingMessage, replyTo, conversation.type, convId, sendMessage, editMessage, simulateAIReply, onMessageSent]
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

  // Bind conversationId so MessageList/PinnedMessages get simple (msgId) callbacks
  const handleRecall = useCallback((msgId: string) => recallMessage(convId, msgId), [convId, recallMessage]);
  const handleDelete = useCallback((msgId: string) => deleteMessage(convId, msgId), [convId, deleteMessage]);
  const handlePin = useCallback((msgId: string) => pinMessage(convId, msgId), [convId, pinMessage]);
  const handleReact = useCallback((msgId: string, emoji: string) => reactToMessage(convId, msgId, emoji), [convId, reactToMessage]);

  const handleJump = useCallback((msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
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

  const pinnedMessages = useMemo(() => messages.filter((m) => m.is_pinned), [messages]);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <ChatBackground themeId={conversation.theme_id} />

      <div className="relative z-10 flex flex-col h-full">
        <ChatWindowHeader
          conversation={conversation}
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
          <PinnedMessages messages={pinnedMessages} onJump={handleJump} />
        )}

        <MessageList
          messages={messages}
          isTyping={isTyping}
          onReply={handleReply}
          onEdit={handleEdit}
          onRecall={handleRecall}
          onDelete={handleDelete}
          onReact={handleReact}
          onPin={handlePin}
          onForward={handleForward}
        />

        {/* AI quick replies */}
        {conversation.type === "ai" && !replyTo && !editingMessage && (
          <AiQuickReplies onSelect={handleSend} disabled={isTyping} />
        )}

        <MessageInput
          replyTo={replyTo}
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
