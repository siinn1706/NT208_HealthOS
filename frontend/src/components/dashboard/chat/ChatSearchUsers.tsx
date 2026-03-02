"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import { MOCK_USERS, MOCK_CONVERSATIONS, CURRENT_USER } from "@/data/chat";
import { getInitials } from "@/lib/chat-utils";
import type { ChatParticipant, Conversation } from "@/types/api";
import { Search, UserPlus } from "lucide-react";

interface ChatSearchUsersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: (conversation: Conversation) => void;
}

export function ChatSearchUsers({
  open,
  onOpenChange,
  onSelectConversation,
  onCreateConversation,
}: ChatSearchUsersProps) {
  const t = useTranslations("chat");
  const [query, setQuery] = useState("");

  const results: ChatParticipant[] =
    query.length >= 2
      ? MOCK_USERS.filter(
          (u) =>
            u.email.toLowerCase().includes(query.toLowerCase()) ||
            u.display_name.toLowerCase().includes(query.toLowerCase())
        )
      : [];

  const handleSelect = useCallback((user: ChatParticipant) => {
    // Check if conversation already exists
    const existing = MOCK_CONVERSATIONS.find(
      (c) =>
        c.type === "direct" &&
        c.participants.some((p) => p.user_id === user.user_id)
    );

    if (existing) {
      onSelectConversation(existing.id);
    } else {
      // Create new conversation
      const now = Date.now();
      const newConv: Conversation = {
        id: `conv-new-${now}`,
        type: "direct",
        participants: [CURRENT_USER, user],
        is_pinned: false,
        is_muted: false,
        unread_count: 0,
        theme_id: null,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      };
      onCreateConversation(newConv);
      onSelectConversation(newConv.id);
    }

    setQuery("");
    onOpenChange(false);
  }, [onSelectConversation, onCreateConversation, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {t("searchUsers")}
          </DialogTitle>
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
