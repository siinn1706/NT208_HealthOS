"use client";

import { useTranslations } from "next-intl";
import { AI_QUICK_REPLY_KEYS } from "@/data/chat";
import { Zap } from "lucide-react";

interface AiQuickRepliesProps {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export function AiQuickReplies({ onSelect, disabled }: AiQuickRepliesProps) {
  const t = useTranslations("chat.ai");

  return (
    <div className="px-4 py-2 border-t border-border bg-background/60">
      <div className="flex items-center gap-1.5 mb-2">
        <Zap className="w-3.5 h-3.5 text-primary" aria-hidden />
        <span className="text-xs font-medium text-muted-foreground">{t("quickReplies")}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {AI_QUICK_REPLY_KEYS.map((key) => {
          const label = t(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(label)}
              disabled={disabled}
              className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/60 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
