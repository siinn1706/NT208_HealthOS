"use client";

import { useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  MoreHorizontal,
  Reply,
  Pin,
  PinOff,
  Copy,
  Pencil,
  Undo2,
  Trash2,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { REACTION_EMOJIS } from "@/data/chat";
import type { Message } from "@/types/api";
import { cn } from "@/lib/utils";

interface MessageActionsProps {
  message: Message;
  isOwn: boolean;
  isAi: boolean;
  onReply: () => void;
  onEdit: () => void;
  onRecall: () => void;
  onDelete: () => void;
  onPin: () => void;
  onReact: (emoji: string) => void;
  onCopy: () => void;
  onForward?: () => void;
  align?: "left" | "right";
}

export function MessageActions({
  message,
  isOwn,
  isAi,
  onReply,
  onEdit,
  onRecall,
  onDelete,
  onPin,
  onReact,
  onCopy,
  onForward,
  align = "left",
}: MessageActionsProps) {
  const t = useTranslations("chat");
  const [showRecallDialog, setShowRecallDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  if (message.is_recalled) return null;

  return (
    <>
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-10 flex items-center gap-1",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
          align === "right" ? "-left-24" : "-right-24"
        )}
      >
        {/* Quick reactions */}
        <Popover open={showReactions} onOpenChange={setShowReactions}>
          <PopoverTrigger asChild>
            <button
              aria-label={t("react")}
              className="w-7 h-7 rounded-full bg-background border border-border shadow-sm flex items-center justify-center text-sm cursor-pointer hover:bg-secondary transition-colors"
            >
              😊
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            className="w-auto p-1.5 flex gap-1"
            sideOffset={4}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReact(emoji); setShowReactions(false); }}
                className="text-xl hover:scale-125 transition-transform cursor-pointer p-0.5"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Message actions"
              className="w-7 h-7 rounded-full bg-background border border-border shadow-sm flex items-center justify-center cursor-pointer hover:bg-secondary transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={align === "right" ? "end" : "start"} className="w-44">
            <DropdownMenuItem onClick={onReply} className="gap-2 cursor-pointer" aria-label={t("replyTo")}>
              <Reply className="w-4 h-4" />
              {t("replyTo")}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onCopy} className="gap-2 cursor-pointer" aria-label={t("copyMessage")}>
              <Copy className="w-4 h-4" />
              {t("copyMessage")}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onPin} className="gap-2 cursor-pointer" aria-label={message.is_pinned ? t("unpinMessage") : t("pinMessage")}>
              {message.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              {message.is_pinned ? t("unpinMessage") : t("pinMessage")}
            </DropdownMenuItem>

            {onForward && (
              <DropdownMenuItem onClick={onForward} className="gap-2 cursor-pointer" aria-label={t("forwardMessage")}>
                <Share2 className="w-4 h-4" />
                {t("forwardMessage")}
              </DropdownMenuItem>
            )}

            {isOwn && !isAi && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer" aria-label={t("editMessage")}>
                  <Pencil className="w-4 h-4" />
                  {t("editMessage")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowRecallDialog(true)}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  aria-label={t("recallMessage")}
                >
                  <Undo2 className="w-4 h-4" />
                  {t("recallMessage")}
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              aria-label={t("deleteMessage")}
            >
              <Trash2 className="w-4 h-4" />
              {t("deleteMessage")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Recall confirmation */}
      <AlertDialog open={showRecallDialog} onOpenChange={setShowRecallDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("recallMessage")}</AlertDialogTitle>
            <AlertDialogDescription>{t("recallMessageConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { onRecall(); setShowRecallDialog(false); }}
            >
              {t("recallMessage")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteMessage")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteMessageConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { onDelete(); setShowDeleteDialog(false); }}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
