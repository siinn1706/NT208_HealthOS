"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { Image as ImageIcon, FileText, Users, Bot } from "lucide-react";
import { AiChatBadge } from "./AiChatBadge";
import { OnlineStatus } from "./OnlineStatus";
import { getConversationName, getInitials } from "@/lib/chat-utils";
import { MOCK_USERS } from "@/data/chat";
import type { Conversation, Message } from "@/types/api";
import { cn } from "@/lib/utils";

interface ConversationInfoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  messages: Message[];
}

export function ConversationInfoPanel({
  open,
  onOpenChange,
  conversation,
  messages,
}: ConversationInfoPanelProps) {
  const t = useTranslations("chat");

  const name = getConversationName(conversation);
  const isAi = conversation.type === "ai";
  const isGroup = conversation.type === "group";

  // Collect shared media (image type messages)
  const sharedImages = messages.filter((m) => m.type === "image" && !m.is_recalled);
  const sharedFiles = messages.filter((m) => m.type === "file" && !m.is_recalled);

  const participantUsers = conversation.participants.map(
    (p) => MOCK_USERS.find((u) => u.user_id === p.user_id) ?? p
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle>{t("conversationInfo")}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 pb-6 space-y-5">
            {/* Avatar + name */}
            <div className="flex flex-col items-center gap-3 pt-2">
              {isAi ? (
                <AiChatBadge size="lg" />
              ) : isGroup ? (
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                  <Users className="w-8 h-8 text-accent" />
                </div>
              ) : (
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-lg font-semibold">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="text-center">
                <p className={cn("font-semibold text-base", isAi && "text-primary")}>{name}</p>
                {isAi && (
                  <div className="flex items-center gap-1.5 justify-center mt-1">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-primary/80">{t("ai.subtitle")}</span>
                  </div>
                )}
                {!isAi && isGroup && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("members", { count: conversation.participants.length })}
                  </p>
                )}
              </div>
              {conversation.is_muted && (
                <Badge variant="secondary" className="text-xs">{t("muted")}</Badge>
              )}
            </div>

            <Separator />

            {/* Members (for group / AI shows single) */}
            {(isGroup || isAi) && (
              <div>
                <p className="text-sm font-semibold mb-3">
                  {isGroup ? t("members", { count: participantUsers.length }) : t("aiAssistant")}
                </p>
                <div className="space-y-2.5">
                  {isAi ? (
                    <div className="flex items-center gap-3">
                      <AiChatBadge size="sm" />
                      <div>
                        <p className="text-sm font-medium">{t("aiAssistant")}</p>
                        <p className="text-xs text-muted-foreground">{t("ai.subtitle")}</p>
                      </div>
                    </div>
                  ) : (
                    participantUsers.map((p) => (
                      <div key={p.user_id} className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(p.display_name)}
                            </AvatarFallback>
                          </Avatar>
                          {p.is_online && (
                            <OnlineStatus isOnline className="absolute bottom-0 right-0" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.is_online ? t("online") : t("offline")}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {(isGroup || isAi) && <Separator />}

            {/* Shared media */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold">{t("sharedMedia")}</p>
                {sharedImages.length > 0 && (
                  <Badge variant="outline" className="text-xs ml-auto">{sharedImages.length}</Badge>
                )}
              </div>
              {sharedImages.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("noMessages")}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {sharedImages.slice(0, 9).map((m) => (
                    <div
                      key={m.id}
                      className="aspect-square rounded-md bg-secondary flex items-center justify-center overflow-hidden"
                    >
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {sharedFiles.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Files</p>
                    <Badge variant="outline" className="text-xs ml-auto">{sharedFiles.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {sharedFiles.slice(0, 5).map((m) => (
                      <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{m.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
