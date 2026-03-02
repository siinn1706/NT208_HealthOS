"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { CURRENT_USER_ID } from "@/data/chat";
import { formatDateSeparator, shouldGroup } from "@/lib/chat-utils";
import { useLocale } from "next-intl";
import type { Message } from "@/types/api";

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  backgroundUrl?: string | null;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onRecall: (msgId: string) => void;
  onDelete: (msgId: string) => void;
  onPin: (msgId: string) => void;
  onReact: (msgId: string, emoji: string) => void;
  onForward?: (msg: Message) => void;
}

export function MessageList({
  messages,
  isTyping,
  backgroundUrl,
  onReply,
  onEdit,
  onRecall,
  onDelete,
  onPin,
  onReact,
  onForward,
}: MessageListProps) {
  const locale = useLocale();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

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
      <ScrollArea className="h-full">
        <div
          role="log"
          aria-live="polite"
          aria-label="Messages"
          className="flex flex-col py-4 relative z-10"
        >
          {messages.map((msg, i) => {
            const isOwn = msg.sender_id === CURRENT_USER_ID;
            const isAi = msg.sender_id === "ai";
            const prev = messages[i - 1];

            const grouped = prev ? shouldGroup(prev, msg) : false;
            const showAvatar = !grouped;

            // Date separator: show when day changes
            let dateSep: string | undefined;
            if (!prev) {
              dateSep = formatDateSeparator(msg.created_at, locale);
            } else {
              const prevDate = new Date(prev.created_at);
              const curDate = new Date(msg.created_at);
              if (
                prevDate.getFullYear() !== curDate.getFullYear() ||
                prevDate.getMonth() !== curDate.getMonth() ||
                prevDate.getDate() !== curDate.getDate()
              ) {
                dateSep = formatDateSeparator(msg.created_at, locale);
              }
            }

            return (
              <div key={msg.id} id={`msg-${msg.id}`}>
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                  isAi={isAi}
                  showAvatar={showAvatar}
                  showDateSeparator={dateSep}
                  onReply={() => onReply(msg)}
                  onEdit={() => onEdit(msg)}
                  onRecall={() => onRecall(msg.id)}
                  onDelete={() => onDelete(msg.id)}
                  onPin={() => onPin(msg.id)}
                  onReact={(emoji) => onReact(msg.id, emoji)}
                  onForward={onForward ? () => onForward(msg) : undefined}
                />
              </div>
            );
          })}

          {isTyping && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
