"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";
import { Search, Plus } from "lucide-react";
import { ConversationItem } from "./ConversationItem";
import { StrangerRequests } from "./StrangerRequests";
import { ChatSearchUsers } from "./ChatSearchUsers";
import type { Conversation, StrangerRequest } from "@/types/api";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  strangerRequests: StrangerRequest[];
  onSelectConversation: (id: string) => void;
  onPinConversation: (id: string) => void;
  onMuteConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onAcceptStranger: (id: string) => void;
  onRejectStranger: (id: string) => void;
  onBlockStranger: (id: string) => void;
  onCreateConversation: (conv: Conversation) => void;
}

export function ConversationList({
  conversations,
  activeId,
  strangerRequests,
  onSelectConversation,
  onPinConversation,
  onMuteConversation,
  onDeleteConversation,
  onAcceptStranger,
  onRejectStranger,
  onBlockStranger,
  onCreateConversation,
}: ConversationListProps) {
  const t = useTranslations("chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const pendingCount = strangerRequests.filter((r) => r.status === "pending").length;

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const name =
        c.type === "ai"
          ? "healthos ai"
          : c.type === "group"
          ? (c.name ?? "").toLowerCase()
          : (c.participants.find((p) => p.user_id !== "user-me")?.display_name ?? "").toLowerCase();
      return (
        name.includes(q) ||
        (c.last_message?.content.toLowerCase().includes(q) ?? false)
      );
    });
  }, [conversations, searchQuery]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold flex-1">{t("title")}</h1>
        <button
          onClick={() => setShowSearch(true)}
          aria-label={t("searchUsers")}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Search bar */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9 h-9 text-sm rounded-xl bg-secondary border-transparent focus-visible:bg-background"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pb-2">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="all" className="text-xs">{t("allChats")}</TabsTrigger>
            <TabsTrigger value="strangers" className="text-xs gap-1.5">
              {t("strangers")}
              {pendingCount > 0 && (
                <span className="w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 min-h-0 mt-0">
          <div className="h-full overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
            <div className="px-2 pb-4 space-y-0.5">
              {filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={activeId === conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  onPin={() => onPinConversation(conv.id)}
                  onMute={() => onMuteConversation(conv.id)}
                  onDelete={() => setDeleteConfirmId(conv.id)}
                />
              ))}
              {filteredConversations.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t("noMessages")}
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="strangers" className="flex-1 min-h-0 mt-0 overflow-y-auto">
          <StrangerRequests
            requests={strangerRequests}
            onAccept={onAcceptStranger}
            onReject={onRejectStranger}
            onBlock={onBlockStranger}
          />
        </TabsContent>
      </Tabs>

      {/* Search users dialog */}
      <ChatSearchUsers
        open={showSearch}
        onOpenChange={setShowSearch}
        onSelectConversation={onSelectConversation}
        onCreateConversation={onCreateConversation}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(o) => !o && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteChat")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteChatConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId) {
                  onDeleteConversation(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
