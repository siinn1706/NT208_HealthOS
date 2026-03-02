"use client";

import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Message } from "@/types/api";

interface ChatSearchBarProps {
  messages: Message[];
  onClose: () => void;
  onJumpToMessage: (msgId: string) => void;
}

export function ChatSearchBar({ messages, onClose, onJumpToMessage }: ChatSearchBarProps) {
  const t = useTranslations("chat");
  const [query, setQuery] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return messages
      .filter((m) => !m.is_recalled && m.type === "text" && m.content.toLowerCase().includes(q))
      .map((m) => m.id);
  }, [query, messages]);

  const handlePrev = useCallback(() => {
    if (results.length === 0) return;
    const newIdx = (currentIdx - 1 + results.length) % results.length;
    setCurrentIdx(newIdx);
    onJumpToMessage(results[newIdx]);
  }, [currentIdx, results, onJumpToMessage]);

  const handleNext = useCallback(() => {
    if (results.length === 0) return;
    const newIdx = (currentIdx + 1) % results.length;
    setCurrentIdx(newIdx);
    onJumpToMessage(results[newIdx]);
  }, [currentIdx, results, onJumpToMessage]);

  // Jump to first result when query changes
  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setCurrentIdx(0);
      const q = e.target.value.toLowerCase();
      if (q.trim()) {
        const first = messages.find(
          (m) => !m.is_recalled && m.type === "text" && m.content.toLowerCase().includes(q)
        );
        if (first) onJumpToMessage(first.id);
      }
    },
    [messages, onJumpToMessage]
  );

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/40 animate-in slide-in-from-top-2 duration-200">
      <div className="flex-1 relative">
        <Input
          autoFocus
          value={query}
          onChange={handleQueryChange}
          placeholder={t("searchInChatPlaceholder")}
          className="h-8 text-sm pr-24"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.shiftKey ? handlePrev() : handleNext();
            if (e.key === "Escape") onClose();
          }}
        />
        {query && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {results.length === 0
              ? t("noSearchResults")
              : `${currentIdx + 1} / ${results.length}`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={handlePrev}
          disabled={results.length === 0}
          aria-label="Previous result"
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={handleNext}
          disabled={results.length === 0}
          aria-label="Next result"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={onClose}
          aria-label="Close search"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
