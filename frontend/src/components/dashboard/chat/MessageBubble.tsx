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
import type { GroupPosition } from "@/lib/chat-utils";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isAi: boolean;
  currentUserId: string | null;
  participantNameById: Record<string, string>;
  showAvatar: boolean;
  showDateSeparator?: string;
  groupPosition?: GroupPosition;
  bubbleRadius?: string;
  onReply: () => void;
  onEdit: () => void;
  onRecall: () => void;
  onDelete: () => void;
  onPin: () => void;
  onReact: (emoji: string) => void;
  onForward?: () => void;
  onJumpToReply?: (replyId: string) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  isAi,
  currentUserId,
  participantNameById,
  showAvatar,
  showDateSeparator,
  groupPosition = "solo",
  bubbleRadius,
  onReply,
  onEdit,
  onRecall,
  onDelete,
  onPin,
  onReact,
  onForward,
  onJumpToReply,
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

  /** Build reply-to display text. Fallback for recalled/deleted originals. */
  function getReplyPreview(reply: NonNullable<Message["reply_to"]>) {
    const name =
      reply.sender_id === currentUserId
        ? t("you")
        : reply.sender_id === "ai"
        ? t("aiAssistant")
        : reply.sender_display_name ??
          participantNameById[reply.sender_id] ??
          "Chưa có thông tin";
    // Empty content means recalled or deleted
    if (!reply.content) {
      return { name, content: null };
    }
    const content =
      reply.type === "image"
        ? t("imageMessage")
        : reply.type === "file"
        ? t("fileMessage")
        : reply.content.length > 60
        ? reply.content.slice(0, 60) + "…"
        : reply.content;
    return { name, content };
  }

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Date separator — centered floating pill */}
      {showDateSeparator && (
        <div className="flex justify-center my-3 px-4">
          <span className="text-[11px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
            {showDateSeparator}
          </span>
        </div>
      )}

      <div
        className={cn(
          "flex items-end gap-2 px-4 group",
          isOwn ? "flex-row-reverse" : "flex-row",
          groupPosition === "middle" || groupPosition === "last" ? "py-0.5" : "py-1.5"
        )}
        role="listitem"
        aria-label={`${isOwn ? "You" : senderName}: ${message.is_recalled ? t("recalled") : message.content}, ${timeStr}`}
        tabIndex={0}
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
        <div className={cn("relative flex flex-col", isOwn && "items-end", isOwn ? "max-w-[85%] md:max-w-[65%]" : "max-w-[85%] md:max-w-[65%]")}>
          {/* Bubble container — reply preview + content share the same rounded block */}
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
                "px-3.5 py-2 text-sm leading-relaxed",
                bubbleRadius ?? (isOwn ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm"),
                isOwn
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground",
                message.is_recalled && "opacity-60 italic"
              )}
            >
              {/* Reply preview — rendered INSIDE the bubble */}
              {message.reply_to && !message.is_recalled && (() => {
                const reply = getReplyPreview(message.reply_to);
                return (
                  <button
                    type="button"
                    onClick={() => onJumpToReply?.(message.reply_to!.id)}
                    className={cn(
                      "block w-full text-left mb-1.5 pb-1.5 -mx-1.5 -mt-0.5 px-1.5 pt-0.5 rounded",
                      "border-l-2 cursor-pointer",
                      isOwn
                        ? "border-l-white/50 bg-white/10"
                        : "border-l-primary/60 bg-black/[0.04] dark:bg-white/[0.04]"
                    )}
                  >
                    <span className={cn("block text-xs font-semibold truncate", isOwn ? "text-white/80" : "text-primary")}>
                      {reply.name}
                    </span>
                    {reply.content ? (
                      <span className={cn("block text-xs truncate leading-tight", isOwn ? "text-white/70" : "text-muted-foreground")}>
                        {reply.content}
                      </span>
                    ) : (
                      <span className={cn("block text-xs italic leading-tight", isOwn ? "text-white/50" : "text-muted-foreground")}>
                        {t("deletedMessage")}
                      </span>
                    )}
                  </button>
                );
              })()}

              {message.is_recalled ? (
                <span>{t("recalled")}</span>
              ) : isAi ? (
                <AiMessageContent content={message.content} />
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

          {/* Meta row — timestamp + status below bubble, tightened */}
          <div className={cn(
            "flex items-center gap-1.5 mt-px",
            isOwn ? "flex-row-reverse" : "flex-row"
          )}>
            <span className="text-[10px] text-muted-foreground/70">{timeStr}</span>
            {message.is_edited && !message.is_recalled && (
              <span className="text-[10px] text-muted-foreground/70 italic">({t("edited")})</span>
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
