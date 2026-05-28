"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { Image as ImageIcon, FileText, Users, Bot, LogOut } from "lucide-react";
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
import { useState } from "react";
import { AiChatBadge } from "./AiChatBadge";
import { GroupMembersSection } from "./GroupMembersSection";
import { AddMembersDialog } from "./AddMembersDialog";
import { getConversationName, getInitials } from "@/lib/chat-utils";
import type { Conversation, Message } from "@/types/api";
import { cn } from "@/lib/utils";

interface ConversationInfoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  currentUserId: string | null;
  messages: Message[];
  onLeaveGroup?: (convId: string) => Promise<boolean>;
  onAddMembers?: (convId: string, userIds: string[]) => Promise<boolean>;
  onRemoveMember?: (convId: string, userId: string) => Promise<boolean>;
  onPromoteMember?: (convId: string, userId: string) => Promise<boolean>;
  onDemoteMember?: (convId: string, userId: string) => Promise<boolean>;
  onTransferOwnership?: (convId: string, userId: string) => Promise<boolean>;
}

export function ConversationInfoPanel({
  open,
  onOpenChange,
  conversation,
  currentUserId,
  messages,
  onLeaveGroup,
  onAddMembers,
  onRemoveMember,
  onPromoteMember,
  onDemoteMember,
  onTransferOwnership,
}: ConversationInfoPanelProps) {
  const t = useTranslations("chat");
  const tg = useTranslations("chat.group");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);

  const name = getConversationName(conversation, currentUserId);
  const isAi = conversation.type === "ai";
  const isGroup = conversation.type === "group";

  const sharedImages = messages.filter((m) => m.type === "image" && !m.is_recalled);
  const sharedFiles = messages.filter((m) => m.type === "file" && !m.is_recalled);

  return (
    <>
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
                      {tg("members", { count: conversation.participants.length })}
                    </p>
                  )}
                </div>
                {conversation.is_muted && (
                  <Badge variant="secondary" className="text-xs">{t("muted")}</Badge>
                )}
              </div>

              <Separator />

              {/* Members list */}
              {isGroup && (
                <>
                  <GroupMembersSection
                    participants={conversation.participants}
                    currentUserId={currentUserId}
                    onAddMembers={() => setShowAddMembers(true)}
                    onRemove={(uid) => onRemoveMember?.(conversation.id, uid) ?? Promise.resolve(false)}
                    onPromote={(uid) => onPromoteMember?.(conversation.id, uid) ?? Promise.resolve(false)}
                    onDemote={(uid) => onDemoteMember?.(conversation.id, uid) ?? Promise.resolve(false)}
                    onTransfer={(uid) => onTransferOwnership?.(conversation.id, uid) ?? Promise.resolve(false)}
                  />
                  <Separator />
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => setShowLeaveConfirm(true)}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {tg("leave")}
                  </Button>
                  <Separator />
                </>
              )}

              {isAi && (
                <>
                  <div>
                    <p className="text-sm font-semibold mb-3">{t("aiAssistant")}</p>
                    <div className="flex items-center gap-3">
                      <AiChatBadge size="sm" />
                      <div>
                        <p className="text-sm font-medium">{t("aiAssistant")}</p>
                        <p className="text-xs text-muted-foreground">{t("ai.subtitle")}</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

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
                  <p className="text-xs text-muted-foreground italic">{t("noMessages")}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {sharedImages.slice(0, 9).map((m) => (
                      <div key={m.id} className="aspect-square rounded-md bg-secondary flex items-center justify-center overflow-hidden">
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

      {/* Leave group confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tg("leaveConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{tg("leaveConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tg("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await onLeaveGroup?.(conversation.id);
                setShowLeaveConfirm(false);
                onOpenChange(false);
              }}
            >
              {tg("leaveConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add members dialog */}
      {isGroup && (
        <AddMembersDialog
          open={showAddMembers}
          onOpenChange={setShowAddMembers}
          existingMemberIds={conversation.participants.map((p) => p.user_id)}
          onAdd={(userIds) => onAddMembers?.(conversation.id, userIds) ?? Promise.resolve(false)}
        />
      )}
    </>
  );
}
