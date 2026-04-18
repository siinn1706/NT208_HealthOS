"use client";

import { useState } from "react";
import { Pin, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Message } from "@/types/api";

interface PinnedMessagesProps {
  messages: Message[];
  currentUserId: string | null;
  participantNameById: Record<string, string>;
  onJump?: (messageId: string) => void;
}

export function PinnedMessages({
  messages,
  currentUserId,
  participantNameById,
  onJump,
}: PinnedMessagesProps) {
  const t = useTranslations("chat");
  const [expanded, setExpanded] = useState(false);

  const pinned = messages.filter((m) => !m.is_recalled);

  if (pinned.length === 0) return null;

  const displayed = expanded ? pinned : pinned.slice(0, 1);

  return (
    <div className="border-b border-border bg-secondary/30 px-4 py-1.5">
      <div className="flex items-center gap-2">
        <Pin className="w-3 h-3 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {displayed.map((msg) => {
            const senderName =
              msg.sender_id === currentUserId
                ? t("you")
                : msg.sender_id === "ai"
                  ? t("aiAssistant")
                  : msg.sender_display_name ?? participantNameById[msg.sender_id] ?? t("unknownUser");

            return (
              <button
                key={msg.id}
                onClick={() => onJump?.(msg.id)}
                className="block w-full text-left cursor-pointer group"
              >
                <span className="text-[11px] font-semibold text-primary">{t("pinned")} · {senderName}</span>
                <p className="text-[11px] text-foreground truncate group-hover:text-primary transition-colors">
                  {msg.content}
                </p>
              </button>
            );
          })}
        </div>
        {pinned.length > 1 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? t("collapsePinned") : t("expandPinned")}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>
      {pinned.length > 1 && !expanded && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {t("pinnedMore", { count: pinned.length - 1 })}
        </p>
      )}
    </div>
  );
}
