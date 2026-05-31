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
  /** Whether this actions bar should align to the right (own) or left (others). */
  side?: "left" | "right";
  /** `horizontal` = hover bar above bubble; `vertical` = touch sheet (full-width rows). */
  layout?: "horizontal" | "vertical";
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
  side = "right",
  layout = "horizontal",
}: MessageActionsProps) {
  const t = useTranslations("chat");
  const [showRecallDialog, setShowRecallDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (message.is_recalled) return null;

  // Dropdown aligns to the bubble edge
  const align = side === "right" ? "end" : "start";

  const isVertical = layout === "vertical";

  return (
    <>
      <div
        className={cn(
          "flex flex-shrink-0",
          isVertical
            ? "flex-col gap-2 w-full opacity-100"
            : "flex-row items-center gap-0.5 self-center"
        )}
        aria-label={t("messageActions")}
      >
        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button"
              aria-label={t("messageActions")}
              className={cn(
                "rounded-lg flex items-center justify-center cursor-pointer hover:bg-accent transition-colors",
                isVertical ? "w-full h-11 px-3 justify-start gap-2 text-sm font-medium" : "size-7 rounded-full"
              )}
              title={t("moreActions")}
            >
              <MoreHorizontal className="size-4 text-muted-foreground flex-shrink-0" />
              {isVertical && <span>{t("moreActions")}</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={align} className="w-44">
            <DropdownMenuItem onClick={onCopy} className="gap-2 cursor-pointer" aria-label={t("copyMessage")}>
              <Copy className="size-4" />
              {t("copyMessage")}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onPin} className="gap-2 cursor-pointer" aria-label={message.is_pinned ? t("unpinMessage") : t("pinMessage")}>
              {message.is_pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              {message.is_pinned ? t("unpinMessage") : t("pinMessage")}
            </DropdownMenuItem>

            {onForward && (
              <DropdownMenuItem onClick={onForward} className="gap-2 cursor-pointer" aria-label={t("forwardMessage")}>
                <Share2 className="size-4" />
                {t("forwardMessage")}
              </DropdownMenuItem>
            )}

            {isOwn && !isAi && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer" aria-label={t("editMessage")}>
                  <Pencil className="size-4" />
                  {t("editMessage")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowRecallDialog(true)}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  aria-label={t("recallMessage")}
                >
                  <Undo2 className="size-4" />
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
              <Trash2 className="size-4" />
              {t("deleteMessage")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Reply button */}
        <button type="button"
          onClick={onReply}
          aria-label={t("replyTo")}
          className={cn(
            "flex items-center justify-center cursor-pointer hover:bg-accent transition-colors",
            isVertical ? "w-full h-11 px-3 rounded-lg justify-start gap-2 text-sm font-medium" : "size-7 rounded-full"
          )}
          title={t("replyTo")}
        >
          <Reply className="size-4 text-muted-foreground flex-shrink-0" />
          {isVertical && <span>{t("replyTo")}</span>}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button"
              aria-label={t("react")}
              className={cn(
                "flex items-center justify-center cursor-pointer hover:bg-accent transition-colors",
                isVertical ? "w-full h-11 px-3 rounded-lg justify-start gap-2 text-sm font-medium" : "size-7 rounded-full"
              )}
              title={t("react")}
            >
              <span className="text-sm leading-none">😊</span>
              {isVertical && <span>{t("react")}</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={align} className="p-1.5">
            <div className="flex items-center gap-0.5 flex-wrap justify-center">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(emoji)}
                  className="text-lg hover:scale-125 transition-transform cursor-pointer p-1 rounded-full hover:bg-accent"
                  aria-label={`${t("react")} ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
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
