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
  const timeStr = conversation.last_message
    ? formatChatTime(conversation.last_message.created_at, locale)
    : "";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onClick}
          aria-label={`Open conversation with ${name}`}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 text-left cursor-pointer",
            isActive
              ? "bg-primary/10 dark:bg-primary/20"
              : "hover:bg-secondary"
          )}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {conversation.type === "ai" ? (
              <AiChatBadge size="md" />
            ) : conversation.type === "group" ? (
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
            ) : (
              <Avatar className="w-10 h-10">
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
                  : preview}
              </p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {conversation.is_muted && (
                  <BellOff className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                {conversation.is_pinned && conversation.type !== "ai" && (
                  <Pin className="w-3.5 h-3.5 text-muted-foreground rotate-45" />
                )}
                {conversation.unread_count > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
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
              {conversation.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              {conversation.is_pinned ? t("unpinChat") : t("pinChat")}
            </ContextMenuItem>
            <ContextMenuItem onClick={onMute} className="gap-2 cursor-pointer">
              {conversation.is_muted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {conversation.is_muted ? t("unmuteChat") : t("muteChat")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={onDelete}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              {t("deleteChat")}
            </ContextMenuItem>
          </>
        )}
        {conversation.type === "ai" && (
          <ContextMenuItem disabled className="gap-2 text-muted-foreground">
            HealthOS AI — {t("pinned")}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});
