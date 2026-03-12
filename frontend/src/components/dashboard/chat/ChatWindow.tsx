"use client";

import { useState, useCallback, useMemo } from "react";
import { useMessages } from "@/hooks/useChat";
import { ChatWindowHeader } from "./ChatWindowHeader";
import { PinnedMessages } from "./PinnedMessages";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ChatSearchBar } from "./ChatSearchBar";
import { ConversationInfoPanel } from "./ConversationInfoPanel";
import { ForwardMessageDialog } from "./ForwardMessageDialog";
import { AiQuickReplies } from "./AiQuickReplies";
import { ChatBackground } from "./ChatBackground";
import type { Conversation, Message } from "@/types/api";

const EMPTY_CONVERSATIONS: Conversation[] = [];

interface ChatWindowProps {
  conversation: Conversation;
  conversations?: Conversation[];
  onBack?: () => void;
  onPin: () => void;
  onMute: () => void;
  onDelete: () => void;
  onThemeChange: (themeId: string | null) => void;
  onMessageSent?: (msg: Message) => void;
}

export function ChatWindow({
  conversation,
  conversations = EMPTY_CONVERSATIONS,
  onBack,
  onPin,
  onMute,
  onDelete,
  onThemeChange,
  onMessageSent,
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
  } = useMessages(conversation.id);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null);

  const convId = conversation.id;

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
          onKeyPress={() => {}}
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
