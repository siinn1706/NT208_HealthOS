"use client";

import { useState } from "react";
import { Pin, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { MOCK_USERS, CURRENT_USER_ID } from "@/data/chat";
import type { Message } from "@/types/api";

interface PinnedMessagesProps {
  messages: Message[];
  onJump?: (messageId: string) => void;
}

export function PinnedMessages({ messages, onJump }: PinnedMessagesProps) {
  const t = useTranslations("chat");
  const [expanded, setExpanded] = useState(false);

  const pinned = messages.filter((m) => m.is_pinned && !m.is_recalled);

  if (pinned.length === 0) return null;

  const displayed = expanded ? pinned : pinned.slice(0, 1);

  return (
    <div className="border-b border-border bg-secondary/40 px-4 py-2">
      <div className="flex items-center gap-2">
        <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {displayed.map((msg) => {
            const senderName =
              msg.sender_id === CURRENT_USER_ID
                ? t("you")
                : msg.sender_id === "ai"
                ? t("aiAssistant")
                : MOCK_USERS.find((u) => u.user_id === msg.sender_id)?.display_name ?? "Unknown";

            return (
              <button
                key={msg.id}
                onClick={() => onJump?.(msg.id)}
                className="block w-full text-left cursor-pointer group"
              >
                <span className="text-xs font-semibold text-primary">{t("pinned")} · {senderName}</span>
                <p className="text-xs text-foreground truncate group-hover:text-primary transition-colors">
                  {msg.content}
                </p>
              </button>
            );
          })}
        </div>
        {pinned.length > 1 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>
      {pinned.length > 1 && !expanded && (
        <p className="text-[10px] text-muted-foreground mt-0.5">+{pinned.length - 1} {t("pinned").toLowerCase()}</p>
      )}
    </div>
  );
}
