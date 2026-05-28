"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { OnlineStatus } from "./OnlineStatus";
import { getInitials } from "@/lib/chat-utils";
import type { ChatParticipant } from "@/types/api";

interface GroupMembersSectionProps {
  participants: ChatParticipant[];
  currentUserId: string | null;
  onAddMembers?: () => void;
  onRemove?: (userId: string) => Promise<boolean>;
  onPromote?: (userId: string) => Promise<boolean>;
  onDemote?: (userId: string) => Promise<boolean>;
  onTransfer?: (userId: string) => Promise<boolean>;
}

export function GroupMembersSection({
  participants,
  currentUserId,
  onAddMembers,
  onRemove,
  onPromote,
  onDemote,
  onTransfer,
}: GroupMembersSectionProps) {
  const t = useTranslations("chat.group");
  const [confirmAction, setConfirmAction] = useState<{
    type: "remove" | "transfer";
    userId: string;
    name: string;
  } | null>(null);

  const me = participants.find((p) => p.user_id === currentUserId);
  const myRole = me?.role ?? "member";
  const isOwner = myRole === "owner";
  const isAdmin = myRole === "admin" || isOwner;

  const handleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "remove") await onRemove?.(confirmAction.userId);
    if (confirmAction.type === "transfer") await onTransfer?.(confirmAction.userId);
    setConfirmAction(null);
  };

  return (
    <>
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">
            {t("members", { count: participants.length })}
          </span>
          {isAdmin && onAddMembers && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddMembers}>
              <UserPlus className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {participants.map((p) => {
          const isMe = p.user_id === currentUserId;
          const canManage = isAdmin && !isMe && p.role !== "owner" && (isOwner || p.role === "member");
          const canPromote = isOwner && p.role === "member";
          const canDemote = isOwner && p.role === "admin";
          const canTransfer = isOwner && !isMe;

          return (
            <div key={p.user_id} className="flex items-center gap-2.5 py-1.5">
              <div className="relative flex-shrink-0">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(p.display_name || "?")}
                  </AvatarFallback>
                </Avatar>
                {p.is_online && <OnlineStatus isOnline className="absolute bottom-0 right-0" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.display_name || p.user_id}</p>
                {p.role && p.role !== "member" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                    {t(p.role as "owner" | "admin")}
                  </Badge>
                )}
              </div>

              {(canManage || canTransfer) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {canPromote && (
                      <DropdownMenuItem onClick={() => onPromote?.(p.user_id)}>
                        {t("promote")}
                      </DropdownMenuItem>
                    )}
                    {canDemote && (
                      <DropdownMenuItem onClick={() => onDemote?.(p.user_id)}>
                        {t("demote")}
                      </DropdownMenuItem>
                    )}
                    {canTransfer && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setConfirmAction({ type: "transfer", userId: p.user_id, name: p.display_name })}
                        >
                          {t("transferOwnership")}
                        </DropdownMenuItem>
                      </>
                    )}
                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setConfirmAction({ type: "remove", userId: p.user_id, name: p.display_name })}
                        >
                          {t("removeMember")}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "transfer"
                ? t("transferOwnershipConfirmTitle")
                : confirmAction?.type === "remove"
                ? `${t("removeMember")} ${confirmAction.name}?`
                : t("leaveConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "transfer"
                ? t("transferOwnershipConfirmDesc")
                : confirmAction?.type === "remove"
                ? null
                : t("leaveConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmAction?.type === "remove" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            >
              {confirmAction?.type === "transfer"
                ? t("transferOwnershipConfirm")
                : confirmAction?.type === "remove"
                ? t("removeMember")
                : t("leaveConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
