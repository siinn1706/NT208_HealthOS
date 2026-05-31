"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Search, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { AiChatBadge } from "./AiChatBadge";
import { getConversationName, getInitials } from "@/lib/chat-utils";
import type { Conversation, Message } from "@/types/api";
import { cn } from "@/lib/utils";

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  conversations: Conversation[];
  onForward: (targetConversationId: string, message: Message) => void;
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  message,
  conversations,
  onForward,
}: ForwardMessageDialogProps) {
  const t = useTranslations("chat");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  if (!message) return null;

  const filtered = conversations.filter((c) =>
    getConversationName(c).toLowerCase().includes(query.toLowerCase())
  );

  function handleConfirm() {
    if (!selected || !message) return;
    onForward(selected, message);
    onOpenChange(false);
    setSelected(null);
    setQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Share2 className="size-4 text-muted-foreground" />
            <DialogTitle>{t("forwardMessage")}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">{t("forwardMessage")}</DialogDescription>
        </DialogHeader>

        {/* Preview of message being forwarded */}
        <div className="rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground truncate ring-1 ring-primary/20">
          {message.content.length > 100 ? message.content.slice(0, 100) + "…" : message.content}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-9"
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Conversation list */}
        <ScrollArea className="max-h-56">
          <div className="space-y-1 pr-1">
            {filtered.map((conv) => {
              const name = getConversationName(conv);
              const isAi = conv.type === "ai";
              const isChecked = selected === conv.id;

              return (
                <button type="button"
                  key={conv.id}
                  onClick={() => setSelected(isChecked ? null : conv.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                    isChecked ? "bg-primary/10" : "hover:bg-secondary"
                  )}
                >
                  {isAi ? (
                    <AiChatBadge size="sm" />
                  ) : (
                    <Avatar className="size-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                    </Avatar>
                  )}
                  <span className={cn("text-sm flex-1 text-left truncate", isAi && "text-primary font-medium")}>
                    {name}
                  </span>
                  {isChecked && (
                    <div className="size-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="size-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t("noResults")}</p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            {t("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            className="cursor-pointer"
          >
            {t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
