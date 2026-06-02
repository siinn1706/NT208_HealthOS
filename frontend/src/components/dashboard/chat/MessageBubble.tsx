"use client";

/* eslint-disable @next/next/no-img-element -- Chat attachment URLs come from Core storage and deployment-specific object stores. */

import { memo, useCallback, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { Pin, CheckCheck, Check, Clock, AlertCircle, CloudOff, RefreshCw, X, Image as ImageIcon, Paperclip } from "lucide-react";
import { MessageActions } from "./MessageActions";
import { MessageReactions } from "./MessageReactions";
import { AiChatBadge } from "./AiChatBadge";
import { AiMessageContent } from "./AiMessageContent";
import { getInitials, formatChatTime, truncateChatPreview } from "@/lib/chat-utils";
import type { Message } from "@/types/api";
import type { GroupPosition } from "@/lib/chat-utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  /** Controls whether the timestamp/meta row is shown for this message.
   *  False = message is part of a consecutive cluster and timestamp is suppressed. */
  showTime?: boolean;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onRecall: (msgId: string) => void;
  onDelete: (msgId: string) => void;
  onPin: (msgId: string) => void;
  onReact: (msgId: string, emoji: string) => void;
  onForward?: (msg: Message) => void;
  onJumpToReply?: (replyId: string) => void;
  /** Open history date picker pre-focused on this message's date. */
  onDateClick?: (date: Date) => void;
  /** Retry sending a failed/queued outgoing message. */
  onRetry?: (msgId: string) => void;
  /** Discard a failed/queued outgoing message from the local outbox. */
  onDiscard?: (msgId: string) => void;
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
  showTime = true,
  onReply,
  onEdit,
  onRecall,
  onDelete,
  onPin,
  onReact,
  onForward,
  onJumpToReply,
  onDateClick,
  onRetry,
  onDiscard,
}: MessageBubbleProps) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const unknown = t("unknownUser");

  const senderName =
    isAi
      ? t("aiAssistant")
      : message.sender_display_name ?? participantNameById[message.sender_id] ?? unknown;
  const timeStr = formatChatTime(message.created_at, locale);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).catch(() => {});
  }, [message.content]);

  function getReplyPreview(reply: NonNullable<Message["reply_to"]>) {
    const name =
      reply.sender_id === currentUserId
        ? t("you")
        : reply.sender_id === "ai"
          ? t("aiAssistant")
          : reply.sender_display_name ?? participantNameById[reply.sender_id] ?? unknown;
    if (!reply.content) {
      return { name, content: null };
    }
    const content =
      reply.type === "image"
        ? t("imageMessage")
        : reply.type === "file"
          ? t("fileMessage")
          : truncateChatPreview(reply.content);
    return { name, content };
  }

  const handleReply = useCallback(() => onReply(message), [onReply, message]);
  const handleEdit = useCallback(() => onEdit(message), [onEdit, message]);
  const handleRecall = useCallback(() => onRecall(message.id), [onRecall, message.id]);
  const handleDelete = useCallback(() => onDelete(message.id), [onDelete, message.id]);
  const handlePin = useCallback(() => onPin(message.id), [onPin, message.id]);
  const handleReact = useCallback((emoji: string) => onReact(message.id, emoji), [onReact, message.id]);
  const handleForward = useCallback(() => {
    onForward?.(message);
  }, [onForward, message]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartRef.current = null;
  }, []);

  const onBubblePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (message.is_recalled || message.type === "system") return;
      if (!window.matchMedia("(max-width: 767px)").matches) return;
      if (e.pointerType === "mouse") return;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      longPressTimerRef.current = setTimeout(() => {
        setMobileActionsOpen(true);
        longPressTimerRef.current = null;
      }, 480);
    },
    [message.is_recalled, message.type]
  );

  const onBubblePointerMove = useCallback((e: React.PointerEvent) => {
    const start = pointerStartRef.current;
    if (!start || !longPressTimerRef.current) return;
    if (Math.abs(e.clientX - start.x) > 12 || Math.abs(e.clientY - start.y) > 12) {
      clearLongPressTimer();
    }
  }, [clearLongPressTimer]);

  const onBubblePointerEnd = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

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
      {showDateSeparator && (
        <div className="flex justify-center my-3 px-4">
          {onDateClick ? (
            <button
              type="button"
              onClick={() => onDateClick(new Date(message.created_at))}
              aria-label={t("jumpToDateAria", { label: showDateSeparator })}
              className="text-[11px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm cursor-pointer hover:bg-background hover:text-foreground transition-colors"
            >
              {showDateSeparator}
            </button>
          ) : (
            <span className="text-[11px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
              {showDateSeparator}
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          "relative flex items-end gap-2 px-4 group",
          isOwn ? "flex-row-reverse" : "flex-row",
          groupPosition === "middle" || groupPosition === "last" ? "py-0.5" : "py-1.5"
        )}
        aria-label={`${isOwn ? t("you") : senderName}: ${message.is_recalled ? t("recalled") : message.content}, ${timeStr}`}
        tabIndex={-1}
        onPointerDown={onBubblePointerDown}
        onPointerMove={onBubblePointerMove}
        onPointerUp={onBubblePointerEnd}
        onPointerCancel={onBubblePointerEnd}
      >
        {!isOwn && (
          <div className="w-8 flex-shrink-0 self-end mb-1">
            {showAvatar ? (
              isAi ? (
                <AiChatBadge size="sm" />
              ) : (
                <Avatar className="size-8">
                  <AvatarFallback className="bg-secondary text-foreground text-xs font-semibold">
                    {getInitials(senderName)}
                  </AvatarFallback>
                </Avatar>
              )
            ) : (
              <div className="size-8" />
            )}
          </div>
        )}

        <div
          className={cn(
            "relative overflow-visible flex flex-col",
            isOwn ? "items-end" : "items-start",
            "max-w-[85%] md:max-w-[65%]"
          )}
        >
          {!message.is_recalled && (
            <>
              {/* Desktop / hover: toolbar beside bubble, vertically centered */}
              <div
                className={cn(
                  "hidden md:flex absolute top-1/2 -translate-y-1/2 z-20 opacity-0 pointer-events-none",
                  "group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
                  "transition-opacity duration-150",
                  "bg-background/95 backdrop-blur-sm border border-border rounded-full shadow-md p-1",
                  isOwn ? "right-full mr-2 flex-row-reverse" : "left-full ml-2"
                )}
              >
                <MessageActions
                  message={message}
                  isOwn={isOwn}
                  isAi={isAi}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onRecall={handleRecall}
                  onDelete={handleDelete}
                  onPin={handlePin}
                  onReact={handleReact}
                  onCopy={handleCopy}
                  onForward={onForward ? handleForward : undefined}
                  side={isOwn ? "right" : "left"}
                  layout="horizontal"
                />
              </div>
            </>
          )}

          <div className="relative overflow-visible">
            <div
              className={cn(
                "px-3.5 py-2 text-sm leading-relaxed overflow-hidden",
                bubbleRadius ?? (isOwn ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm"),
                isOwn
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground",
                message.is_recalled && "opacity-60 italic"
              )}
            >
              {message.reply_to && !message.is_recalled && (() => {
                const reply = getReplyPreview(message.reply_to);
                return (
                  <button
                    type="button"
                    role="link"
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToReply?.(message.reply_to!.id);
                    }}
                    className={cn(
                      "block w-full text-left mb-1.5 pb-1.5 -mx-1.5 -mt-0.5 px-1.5 pt-0.5 rounded",
                      "border-l-2 cursor-pointer",
                      isOwn
                        ? "border-l-white/50 bg-white/10"
                        : "border-l-primary/60 bg-black/[0.04] dark:bg-white/[0.04]"
                    )}
                  >
                    <span
                      className={cn(
                        "block text-xs font-semibold truncate",
                        isOwn ? "text-white/80" : "text-primary"
                      )}
                    >
                      {reply.name}
                    </span>
                    {reply.content ? (
                      <span
                        className={cn(
                          "block text-xs truncate leading-tight",
                          isOwn ? "text-white/70" : "text-muted-foreground"
                        )}
                      >
                        {reply.content}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "block text-xs italic leading-tight",
                          isOwn ? "text-white/50" : "text-muted-foreground"
                        )}
                      >
                        {t("deletedMessage")}
                      </span>
                    )}
                  </button>
                );
              })()}

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
                <span
                  className="whitespace-pre-wrap break-words overflow-wrap-anywhere"
                  style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                >
                  {message.content}
                </span>
              )}
              {!message.is_recalled && message.attachments?.length ? (
                <div className={cn("grid gap-2", message.content ? "mt-2" : "mt-0")}>
                  {message.attachments.map((attachment) => (
                    <AttachmentPreview
                      key={`${attachment.url}-${attachment.name}`}
                      attachment={attachment}
                      isOwn={isOwn}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {message.is_pinned && (
              <Pin
                className={cn(
                  "absolute -top-2 size-3 text-primary",
                  isOwn ? "-left-1" : "-right-1"
                )}
              />
            )}
          </div>

          {showTime && (
            <div
              className={cn(
                "flex items-center gap-1.5 mt-px",
                isOwn ? "flex-row-reverse" : "flex-row"
              )}
            >
              {onDateClick ? (
                <button
                  type="button"
                  onClick={() => onDateClick(new Date(message.created_at))}
                  aria-label={t("jumpToDateAria", { label: timeStr })}
                  className="text-[10px] text-muted-foreground/70 cursor-pointer hover:text-foreground hover:underline underline-offset-2 transition-colors"
                >
                  {timeStr}
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground/70">{timeStr}</span>
              )}
              {message.is_edited && !message.is_recalled && !isAi && (
                <span className="text-[10px] text-muted-foreground/70 italic">({t("edited")})</span>
              )}
              {isOwn && !message.is_recalled && <MessageStatus status={message.status} t={t} />}
              {isAi && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                  {t("ai.disclaimer")}
                </span>
              )}
            </div>
          )}

          {isOwn && message.status === "failed" && (
            <RetryRow
              messageId={message.id}
              errorCode={message.error_code}
              onRetry={onRetry}
              onDiscard={onDiscard}
              t={t}
            />
          )}

          <MessageReactions
            reactions={message.reactions}
            onReact={handleReact}
            align={isOwn ? "right" : "left"}
            currentUserId={currentUserId}
          />
        </div>
      </div>

      {!message.is_recalled && (
        <Sheet open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <SheetHeader>
              <SheetTitle>{t("messageActions")}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 px-1">
              <MessageActions
                message={message}
                isOwn={isOwn}
                isAi={isAi}
                onReply={() => {
                  handleReply();
                  setMobileActionsOpen(false);
                }}
                onEdit={() => {
                  handleEdit();
                  setMobileActionsOpen(false);
                }}
                onRecall={() => {
                  handleRecall();
                  setMobileActionsOpen(false);
                }}
                onDelete={() => {
                  handleDelete();
                  setMobileActionsOpen(false);
                }}
                onPin={() => {
                  handlePin();
                  setMobileActionsOpen(false);
                }}
                onReact={(emoji) => {
                  handleReact(emoji);
                  setMobileActionsOpen(false);
                }}
                onCopy={() => {
                  handleCopy();
                  setMobileActionsOpen(false);
                }}
                onForward={
                  onForward
                    ? () => {
                        handleForward();
                        setMobileActionsOpen(false);
                      }
                    : undefined
                }
                side={isOwn ? "right" : "left"}
                layout="vertical"
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
});

function AttachmentPreview({
  attachment,
  isOwn,
}: {
  attachment: NonNullable<Message["attachments"]>[number];
  isOwn: boolean;
}) {
  const isImage = attachment.mime_type.toLowerCase().startsWith("image/");
  if (isImage) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group/image block overflow-hidden rounded-lg border",
          isOwn ? "border-white/25 bg-white/10" : "border-border bg-background/60"
        )}
      >
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-72 w-56 max-w-full object-cover transition-transform duration-200 group-hover/image:scale-[1.015]"
          loading="lazy"
        />
        <span
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-[11px]",
            isOwn ? "text-white/75" : "text-muted-foreground"
          )}
        >
          <ImageIcon className="size-3" aria-hidden />
          <span className="truncate">{attachment.name}</span>
          <span className="shrink-0">{formatBytes(attachment.size)}</span>
        </span>
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex max-w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-[12px]",
        isOwn ? "border-white/25 bg-white/10 text-white/85" : "border-border bg-background/60 text-foreground"
      )}
    >
      <Paperclip className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
      <span className={cn("shrink-0", isOwn ? "text-white/65" : "text-muted-foreground")}>
        {formatBytes(attachment.size)}
      </span>
    </a>
  );
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function MessageStatus({
  status,
  t,
}: {
  status: Message["status"];
  t: ReturnType<typeof useTranslations>;
}) {
  if (status === "queued") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
        aria-label={t("status.queued")}
        title={t("status.queued")}
      >
        <CloudOff className="size-3" aria-hidden />
      </span>
    );
  }
  if (status === "sending") {
    return (
      <Clock
        className="size-3 text-muted-foreground"
        aria-label={t("status.sending")}
      />
    );
  }
  if (status === "sent") {
    return (
      <Check
        className="size-3 text-muted-foreground"
        aria-label={t("status.sent")}
      />
    );
  }
  if (status === "delivered") {
    return (
      <CheckCheck
        className="size-3 text-muted-foreground"
        aria-label={t("status.delivered")}
      />
    );
  }
  if (status === "read") {
    return (
      <CheckCheck className="size-3 text-primary" aria-label={t("status.read")} />
    );
  }
  if (status === "failed") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-destructive"
        aria-label={t("status.failed")}
        title={t("status.failed")}
      >
        <AlertCircle className="size-3" aria-hidden />
      </span>
    );
  }
  return null;
}

function RetryRow({
  messageId,
  errorCode,
  onRetry,
  onDiscard,
  t,
}: {
  messageId: string;
  errorCode?: Message["error_code"];
  onRetry?: (id: string) => void;
  onDiscard?: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const reasonKey =
    errorCode === "rate_limited"
      ? "status.failedReasonRateLimited"
      : errorCode === "validation"
        ? "status.failedReasonValidation"
        : "status.failedReasonNetwork";
  return (
    <div
      className="mt-1 flex items-center gap-2 text-[11px] text-destructive"
      role="alert"
    >
      <span>{t(reasonKey)}</span>
      {onRetry && (
        <button
          type="button"
          onClick={() => onRetry(messageId)}
          className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          <RefreshCw className="size-3" aria-hidden />
          {t("status.retry")}
        </button>
      )}
      {onDiscard && (
        <button
          type="button"
          onClick={() => onDiscard(messageId)}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3" aria-hidden />
          {t("status.discard")}
        </button>
      )}
    </div>
  );
}
