"use client";

import { memo, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { Pin, CheckCheck, Check, Clock } from "lucide-react";
import { MessageActions } from "./MessageActions";
import { MessageReactions } from "./MessageReactions";
import { AiChatBadge } from "./AiChatBadge";
import { AiMessageContent } from "./AiMessageContent";
import { getInitials, formatChatTime } from "@/lib/chat-utils";
import type { Message } from "@/types/api";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isAi: boolean;
  currentUserId: string | null;
  participantNameById: Record<string, string>;
  showAvatar: boolean;
  showDateSeparator?: string;
  onReply: () => void;
  onEdit: () => void;
  onRecall: () => void;
  onDelete: () => void;
  onPin: () => void;
  onReact: (emoji: string) => void;
  onForward?: () => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  isAi,
  currentUserId,
  participantNameById,
  showAvatar,
  showDateSeparator,
  onReply,
  onEdit,
  onRecall,
  onDelete,
  onPin,
  onReact,
  onForward,
}: MessageBubbleProps) {
  const t = useTranslations("chat");
  const locale = useLocale();

  const senderName =
    isAi
      ? "HealthOS AI"
      : message.sender_display_name ??
        participantNameById[message.sender_id] ??
        "Chưa có thông tin";
  const timeStr = formatChatTime(message.created_at, locale);

  // Must be declared before any early returns (React Hooks rules)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).catch(() => {});
  }, [message.content]);

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-muted-foreground bg-secondary/60 rounded-full px-3 py-1">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <>
      {showDateSeparator && (
        <div className="flex items-center gap-3 my-4 px-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground flex-shrink-0">{showDateSeparator}</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      <div
        className={cn(
          "flex items-end gap-2 px-4 py-0.5 group",
          isOwn ? "flex-row-reverse" : "flex-row"
        )}
        role="listitem"
        aria-label={`${isOwn ? "You" : senderName}: ${message.is_recalled ? t("recalled") : message.content}, ${timeStr}`}
      >
        {/* Avatar — only for other users */}
        {!isOwn && (
          <div className="w-8 flex-shrink-0 self-end mb-1">
            {showAvatar ? (
              isAi ? (
                <AiChatBadge size="sm" />
              ) : (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-secondary text-foreground text-xs font-semibold">
                    {getInitials(senderName)}
                  </AvatarFallback>
                </Avatar>
              )
            ) : (
              <div className="w-8 h-8" />
            )}
          </div>
        )}

        {/* Message bubble + actions */}
        <div className={cn("relative max-w-[70%] flex flex-col", isOwn && "items-end")}>
          {/* Reply preview */}
          {message.reply_to && !message.is_recalled && (
            <div className={cn(
              "mb-1 px-2 py-1 rounded-lg border-l-2 border-primary/60 bg-secondary/60 max-w-full",
              "text-xs text-muted-foreground truncate"
            )}>
                <span className="font-medium text-primary">
                {message.reply_to.sender_id === currentUserId
                  ? t("you")
                  : message.reply_to.sender_id === "ai"
                  ? t("aiAssistant")
                  : message.reply_to.sender_display_name ??
                    participantNameById[message.reply_to.sender_id] ??
                    "Chưa có thông tin"}
                </span>
              {" · "}
              <span className="truncate">
                {message.reply_to.content.length > 60
                  ? message.reply_to.content.slice(0, 60) + "…"
                  : message.reply_to.content}
              </span>
            </div>
          )}

          {/* Bubble */}
          <div className="relative">
            {/* Message actions (hover) */}
            {!message.is_recalled && (
              <MessageActions
                message={message}
                isOwn={isOwn}
                isAi={isAi}
                onReply={onReply}
                onEdit={onEdit}
                onRecall={onRecall}
                onDelete={onDelete}
                onPin={onPin}
                onReact={onReact}
                onCopy={handleCopy}
                onForward={onForward}
                align={isOwn ? "right" : "left"}
              />
            )}

            <div
              className={cn(
                "px-3.5 py-2 rounded-2xl text-sm leading-relaxed",
                isOwn
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary text-foreground rounded-bl-sm",
                message.is_recalled && "opacity-60 italic"
              )}
            >
              {message.is_recalled ? (
                <span>{t("recalled")}</span>
              ) : isAi ? (
                <span className="inline-flex flex-col">
                  <AiMessageContent content={message.content || (message.status === "streaming" ? "…" : "")} />
                  {message.status === "streaming" && (
                    <span
                      aria-label={t("ai.streaming")}
                      className="inline-block w-1.5 h-3 bg-current animate-pulse mt-1"
                    />
                  )}
                </span>
              ) : (
                <span className="whitespace-pre-wrap break-words">{message.content}</span>
              )}
            </div>

            {/* Pinned indicator */}
            {message.is_pinned && (
              <Pin className={cn(
                "absolute -top-2 w-3 h-3 text-primary",
                isOwn ? "-left-1" : "-right-1"
              )} />
            )}
          </div>

          {/* Meta row */}
          <div className={cn(
            "flex items-center gap-1.5 mt-0.5",
            isOwn ? "flex-row-reverse" : "flex-row"
          )}>
            <span className="text-[10px] text-muted-foreground">{timeStr}</span>
            {message.is_edited && !message.is_recalled && (
              <span className="text-[10px] text-muted-foreground italic">({t("edited")})</span>
            )}
            {isOwn && !message.is_recalled && (
              <MessageStatus status={message.status} />
            )}
            {isAi && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                {t("ai.disclaimer")}
              </span>
            )}
          </div>

          {/* Reactions */}
          <MessageReactions
            reactions={message.reactions}
            onReact={onReact}
            align={isOwn ? "right" : "left"}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </>
  );
});

function MessageStatus({ status }: { status: Message["status"] }) {
  if (status === "sending") return <Clock className="w-3 h-3 text-muted-foreground" />;
  if (status === "sent") return <Check className="w-3 h-3 text-muted-foreground" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
  if (status === "read") return <CheckCheck className="w-3 h-3 text-primary" />;
  return null;
}
