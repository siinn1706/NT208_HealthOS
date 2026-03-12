"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import { bffFetch } from "@/lib/api-client";
import { getInitials } from "@/lib/chat-utils";
import type { ChatParticipant, Conversation } from "@/types/api";
import { Search, UserPlus } from "lucide-react";

interface ChatSearchUsersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Conversation[];
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: (targetUserId: string) => Promise<Conversation | null>;
}

export function ChatSearchUsers({
  open,
  onOpenChange,
  conversations,
  onSelectConversation,
  onCreateConversation,
}: ChatSearchUsersProps) {
  const t = useTranslations("chat");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatParticipant[]>([]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery("");
      setResults([]);
    }
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      bffFetch<{ data: Array<{ id: string; display_name: string; email: string; avatar_url: string | null }> }>(
        `/api/v1/users/search?q=${encodeURIComponent(query.trim())}`
      )
        .then(({ data }) => {
          if (cancelled) return;
          setResults(
            data.map((user) => ({
              user_id: String(user.id),
              display_name: user.display_name,
              avatar_url: user.avatar_url,
              email: user.email,
              is_online: false,
              last_seen: null,
            }))
          );
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  const handleSelect = useCallback(async (user: ChatParticipant) => {
    const existing = conversations.find(
      (conversation) =>
        conversation.type === "direct" &&
        conversation.participants.some((participant) => participant.user_id === user.user_id)
    );

    if (existing) {
      onSelectConversation(existing.id);
      setQuery("");
      onOpenChange(false);
      return;
    }

    const created = await onCreateConversation(user.user_id);
    if (created) {
      onSelectConversation(created.id);
      setQuery("");
      onOpenChange(false);
    }
  }, [conversations, onSelectConversation, onCreateConversation, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {t("searchUsers")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("searchUsers")}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchByEmail")}
            className="pl-9"
          />
        </div>

        {query.length >= 2 && (
          <ScrollArea className="max-h-60">
            {results.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">{t("noResults")}</p>
            ) : (
              <ul className="space-y-1">
                {results.map((user) => (
                  <li key={user.user_id}>
                    <button
                      onClick={() => handleSelect(user)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer text-left"
                    >
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                          {getInitials(user.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        )}

        {query.length < 2 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            {t("searchByEmail")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
