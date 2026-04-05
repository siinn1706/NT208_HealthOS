"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslations } from "next-intl";
import type { MessageReaction } from "@/types/api";
import { cn } from "@/lib/utils";

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onReact: (emoji: string) => void;
  align?: "left" | "right";
  currentUserId: string | null;
}

export function MessageReactions({
  reactions,
  onReact,
  align = "left",
  currentUserId,
}: MessageReactionsProps) {
  const [openEmoji, setOpenEmoji] = useState<string | null>(null);
  const t = useTranslations("chat");

  if (reactions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1 mt-1", align === "right" && "justify-end")}>
      {reactions.map((r) => {
        const hasReacted = !!currentUserId && r.user_ids.includes(currentUserId);
        return (
          <Popover key={r.emoji} open={openEmoji === r.emoji} onOpenChange={(o) => setOpenEmoji(o ? r.emoji : null)}>
            <PopoverTrigger asChild>
              <button
                onClick={() => onReact(r.emoji)}
                aria-label={`${r.emoji} ${r.user_ids.length}`}
                className={cn(
                  "flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border",
                  "transition-all duration-150 cursor-pointer",
                  hasReacted
                    ? "bg-primary/20 border-primary/40"
                    : "bg-background border-border hover:bg-secondary"
                )}
              >
                <span>{r.emoji}</span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {r.user_ids.length}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-auto p-2 text-xs">
              <p className="font-semibold mb-1">{r.emoji}</p>
              <ul className="space-y-0.5">
                {r.user_ids.map((uid) => {
                  const name =
                    uid === currentUserId
                      ? t("you")
                      : uid === "ai"
                      ? t("aiAssistant")
                      : r.user_names?.[uid] ?? uid;
                  return <li key={uid}>{name}</li>;
                })}
              </ul>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}
