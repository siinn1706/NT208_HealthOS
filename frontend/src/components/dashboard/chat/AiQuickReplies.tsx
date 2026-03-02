"use client";

import { useTranslations } from "next-intl";
import { AI_QUICK_REPLIES } from "@/data/chat";
import { Zap } from "lucide-react";

interface AiQuickRepliesProps {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export function AiQuickReplies({ onSelect, disabled }: AiQuickRepliesProps) {
  const t = useTranslations("chat");

  return (
    <div className="px-4 py-2 border-t border-border bg-background/60">
      <div className="flex items-center gap-1.5 mb-2">
        <Zap className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">{t("ai.quickReplies")}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {AI_QUICK_REPLIES.map((reply) => (
          <button
            key={reply}
            onClick={() => onSelect(reply)}
            disabled={disabled}
            className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/60 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reply}
          </button>
        ))}
      </div>
    </div>
  );
}
