"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { formatDateSeparator, getGroupPosition, getBubbleRadius, type GroupPosition } from "@/lib/chat-utils";
import { useLocale } from "next-intl";
import type { Message } from "@/types/api";

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  participantNameById: Record<string, string>;
  isTyping: boolean;
  backgroundUrl?: string | null;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onRecall: (msgId: string) => void;
  onDelete: (msgId: string) => void;
  onPin: (msgId: string) => void;
  onReact: (msgId: string, emoji: string) => void;
  onForward?: (msg: Message) => void;
  onJumpToReply?: (replyId: string) => void;
}

export interface MessageListHandle {
  jumpToMessage: (msgId: string) => void;
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(function MessageList({
  messages,
  currentUserId,
  participantNameById,
  isTyping,
  backgroundUrl,
  onReply,
  onEdit,
  onRecall,
  onDelete,
  onPin,
  onReact,
  onForward,
  onJumpToReply,
}, ref) {
  const locale = useLocale();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  // Track highlighted message for jump-to-reply feedback
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    jumpToMessage(msgId: string) {
      const index = messages.findIndex((m) => m.id === msgId);
      if (index >= 0 && virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({ index, align: "center", behavior: "smooth" });
        setHighlightedId(msgId);
      }
    },
  }), [messages]);

  const itemContent = useCallback(
    (index: number) => {
      const msg = messages[index];
      const isOwn = !!currentUserId && msg.sender_id === currentUserId;
      const isAi =
        msg.sender_id === "ai" ||
        (msg.sender_display_name?.toLowerCase().includes("ai") ?? false);
      const prev  = messages[index - 1];
      const next  = messages[index + 1];

      const groupPosition = getGroupPosition(
        prev ? { sender_id: prev.sender_id, created_at: prev.created_at } : null,
        { sender_id: msg.sender_id, created_at: msg.created_at },
        next ? { sender_id: next.sender_id, created_at: next.created_at } : null
      );

      const showAvatar = groupPosition === "solo" || groupPosition === "first";

      let dateSep: string | undefined;
      if (!prev) {
        dateSep = formatDateSeparator(msg.created_at, locale);
      } else {
        const prevDate = new Date(prev.created_at);
        const curDate  = new Date(msg.created_at);
        if (
          prevDate.getFullYear() !== curDate.getFullYear() ||
          prevDate.getMonth()    !== curDate.getMonth()    ||
          prevDate.getDate()     !== curDate.getDate()
        ) {
          dateSep = formatDateSeparator(msg.created_at, locale);
        }
      }

      // Wrap highlight on the target element
      const isHighlighted = msg.id === highlightedId;

      return (
        <div
          id={`msg-${msg.id}`}
          className={isHighlighted ? "animate-msg-highlight rounded-xl" : undefined}
          onAnimationEnd={() => { if (isHighlighted) setHighlightedId(null); }}
        >
          <MessageBubble
            message={msg}
            isOwn={isOwn}
            isAi={isAi}
            currentUserId={currentUserId}
            participantNameById={participantNameById}
            showAvatar={showAvatar}
            showDateSeparator={dateSep}
            groupPosition={groupPosition}
            bubbleRadius={getBubbleRadius(groupPosition, isOwn)}
            onReply={() => onReply(msg)}
            onEdit={() => onEdit(msg)}
            onRecall={() => onRecall(msg.id)}
            onDelete={() => onDelete(msg.id)}
            onPin={() => onPin(msg.id)}
            onReact={(emoji) => onReact(msg.id, emoji)}
            onForward={onForward ? () => onForward(msg) : undefined}
            onJumpToReply={onJumpToReply}
          />
        </div>
      );
    },
    [
      messages,
      locale,
      onReply,
      onEdit,
      onRecall,
      onDelete,
      onPin,
      onReact,
      onForward,
      onJumpToReply,
      currentUserId,
      participantNameById,
    ]
  );

  const Footer = useCallback(
    () => (isTyping ? <TypingIndicator /> : null),
    [isTyping]
  );

  return (
    <div
      className="flex-1 overflow-hidden relative"
      style={
        backgroundUrl
          ? {
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {backgroundUrl && (
        <div className="absolute inset-0 bg-background/40 dark:bg-background/60" />
      )}
      <div className="absolute inset-0 z-10">
        <Virtuoso
          ref={virtuosoRef}
          role="log"
          aria-live="polite"
          aria-label="Messages"
          style={{ height: "100%" }}
          totalCount={messages.length}
          itemContent={itemContent}
          followOutput="smooth"
          initialTopMostItemIndex={Math.max(0, messages.length - 1)}
          alignToBottom
          overscan={300}
          components={{ Footer }}
        />
      </div>
    </div>
  );
});
