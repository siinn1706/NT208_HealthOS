"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  MoreVertical,
  Pin,
  PinOff,
  BellOff,
  Bell,
  Trash2,
  Palette,
  Users,
  Circle,
  Search,
  Info,
} from "lucide-react";
import { AiChatBadge } from "./AiChatBadge";
import { OnlineStatus } from "./OnlineStatus";
import { ChatThemePicker } from "./ChatThemePicker";
import { getConversationName, getInitials, getOtherParticipant } from "@/lib/chat-utils";
import type { Conversation } from "@/types/api";
import { cn } from "@/lib/utils";

interface ChatWindowHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
  onPin: () => void;
  onMute: () => void;
  onDelete: () => void;
  onThemeChange: (themeId: string | null) => void;
  onSearch?: () => void;
  onInfoOpen?: () => void;
}

export function ChatWindowHeader({
  conversation,
  onBack,
  onPin,
  onMute,
  onDelete,
  onThemeChange,
  onSearch,
  onInfoOpen,
}: ChatWindowHeaderProps) {
  const t = useTranslations("chat");
  const [showThemePicker, setShowThemePicker] = useState(false);

  const name = getConversationName(conversation);
  const other = getOtherParticipant(conversation);
  const isAi = conversation.type === "ai";
  const isGroup = conversation.type === "group";

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
        {/* Back button (mobile) */}
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="md:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {isAi ? (
            <AiChatBadge size="md" />
          ) : isGroup ? (
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
          ) : (
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-secondary text-foreground text-sm font-semibold">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
          )}
          {!isAi && !isGroup && other?.is_online && (
            <OnlineStatus isOnline className="absolute bottom-0 right-0" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold truncate", isAi && "text-primary")}>
            {name}
          </p>
          <p className="text-xs text-muted-foreground">
            {isAi ? (
              <span className="text-primary/80">{t("ai.subtitle")}</span>
            ) : isGroup ? (
              t("members", { count: conversation.participants.length })
            ) : other?.is_online ? (
              <span className="flex items-center gap-1">
                <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                {t("online")}
              </span>
            ) : other?.last_seen ? (
              `${t("lastSeen")} ${new Date(other.last_seen).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
            ) : (
              t("offline")
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {onSearch && (
            <button
              onClick={onSearch}
              aria-label={t("searchInChat")}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {onInfoOpen && (
            <button
              onClick={onInfoOpen}
              aria-label={t("conversationInfo")}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="More options"
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setShowThemePicker(true)} className="gap-2 cursor-pointer">
              <Palette className="w-4 h-4" />
              {t("changeTheme")}
            </DropdownMenuItem>

            {!isAi && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onPin} className="gap-2 cursor-pointer">
                  {conversation.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  {conversation.is_pinned ? t("unpinChat") : t("pinChat")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onMute} className="gap-2 cursor-pointer">
                  {conversation.is_muted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  {conversation.is_muted ? t("unmuteChat") : t("muteChat")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("deleteChat")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>        </div>      </div>

      <ChatThemePicker
        open={showThemePicker}
        onOpenChange={setShowThemePicker}
        currentThemeId={conversation.theme_id}
        onSelect={onThemeChange}
      />
    </>
  );
}
