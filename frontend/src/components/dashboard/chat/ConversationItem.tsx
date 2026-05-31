"use client";

import { memo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Pin, PinOff, BellOff, Bell, Trash2, Users
} from "lucide-react";
import {
  getConversationName,
  getInitials,
  getOtherParticipant,
  getMessagePreview,
  formatChatTime,
} from "@/lib/chat-utils";
import { AiChatBadge } from "./AiChatBadge";
import { OnlineStatus } from "./OnlineStatus";
import type { Conversation } from "@/types/api";

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string | null;
  isActive: boolean;
  onClick: () => void;
  onPin: () => void;
  onMute: () => void;
  onDelete: () => void;
}

export const ConversationItem = memo(function ConversationItem({
  conversation,
  currentUserId,
  isActive,
  onClick,
  onPin,
  onMute,
  onDelete,
}: ConversationItemProps) {
  const t = useTranslations("chat");
  const locale = useLocale();

  const name = getConversationName(conversation, currentUserId);
  const other = getOtherParticipant(conversation, currentUserId);
  const preview = getMessagePreview(conversation, currentUserId);

  // Build delivery status prefix for own outgoing messages in the preview line
  // ✓ for sent, ✓✓ for delivered or read. Kept subtle via muted-foreground color.
  // TODO: Add typing indicator here when WebSocket per-conversation typing state is available
  const deliveryStatusPrefix = (() => {
    if (!conversation.last_message || conversation.last_message.sender_id !== currentUserId) {
      return null;
    }
    const status = conversation.last_message.status;
    if (status === "sent") return <span className="text-muted-foreground text-[10px]">{"✓ "}</span>;
    if (status === "delivered" || status === "read") return <span className="text-muted-foreground text-[10px]">{"✓✓ "}</span>;
    return null;
  })();
  const timeStr = conversation.last_message
    ? formatChatTime(conversation.last_message.created_at, locale)
    : "";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button type="button"
          onClick={onClick}
          aria-label={`Open conversation with ${name}`}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 text-left cursor-pointer",
            isActive
              ? "bg-primary/10 dark:bg-primary/20 border-l-[3px] border-l-primary rounded-l-none"
              : "hover:bg-secondary border-l-[3px] border-l-transparent"
          )}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {conversation.type === "ai" ? (
              <AiChatBadge size="md" />
            ) : conversation.type === "group" ? (
              <div className="size-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Users className="size-5 text-accent" />
              </div>
            ) : (
              <Avatar className="size-10">
                <AvatarFallback className={cn(
                  "text-sm font-semibold",
                  isActive ? "bg-primary/20 text-primary" : "bg-secondary text-foreground"
                )}>
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
            )}
            {conversation.type === "direct" && other?.is_online && (
              <OnlineStatus
                isOnline
                className="absolute bottom-0 right-0"
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-1">
              <span className={cn(
                "text-sm truncate min-w-0 flex-1",
                conversation.unread_count > 0 ? "font-semibold" : "font-medium"
              )}>
                {conversation.type === "ai" ? (
                  <span className="text-primary">{name}</span>
                ) : (
                  name
                )}
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground flex-shrink-0">{timeStr}</span>
            </div>
            <div className="flex items-center justify-between gap-1 mt-0.5 min-w-0">
              <p className={cn(
                "text-xs truncate min-w-0 flex-1",
                conversation.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {conversation.last_message?.is_recalled
                  ? <span className="italic">{t("recalled")}</span>
                  : <>
                      {deliveryStatusPrefix}
                      {preview}
                    </>
                }
              </p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {conversation.is_muted && (
                  <BellOff className="size-3.5 text-muted-foreground" />
                )}
                {conversation.is_pinned && conversation.type !== "ai" && (
                  <Pin className="size-3.5 text-muted-foreground rotate-45" />
                )}
                {conversation.unread_count > 0 && (
                  <span className={cn(
                    "min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full flex items-center justify-center",
                    conversation.is_muted
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground"
                  )}>
                    {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        {conversation.type !== "ai" && (
          <>
            <ContextMenuItem onClick={onPin} className="gap-2 cursor-pointer">
              {conversation.is_pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              {conversation.is_pinned ? t("unpinChat") : t("pinChat")}
            </ContextMenuItem>
            <ContextMenuItem onClick={onMute} className="gap-2 cursor-pointer">
              {conversation.is_muted ? <Bell className="size-4" /> : <BellOff className="size-4" />}
              {conversation.is_muted ? t("unmuteChat") : t("muteChat")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={onDelete}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              {t("deleteChat")}
            </ContextMenuItem>
          </>
        )}
        {conversation.type === "ai" && (
          <ContextMenuItem disabled className="gap-2 text-muted-foreground">
            HealthOS AI: {t("pinned")}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});
