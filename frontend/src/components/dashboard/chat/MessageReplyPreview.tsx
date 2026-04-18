"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Message } from "@/types/api";
import { truncateChatPreview } from "@/lib/chat-utils";

interface MessageReplyPreviewProps {
  replyTo: Pick<Message, "id" | "content" | "sender_id" | "sender_display_name" | "type">;
  currentUserId: string | null;
  onCancel: () => void;
  /** shown in input bar */
  mode?: "input";
}

export function MessageReplyPreview({ replyTo, currentUserId, onCancel }: MessageReplyPreviewProps) {
  const t = useTranslations("chat");

  const senderName =
    replyTo.sender_id === currentUserId
      ? t("you")
      : replyTo.sender_id === "ai"
        ? t("aiAssistant")
        : replyTo.sender_display_name ?? t("unknownUser");

  const preview =
    replyTo.type === "image"
      ? t("imageMessage")
      : replyTo.type === "file"
        ? t("fileMessage")
        : truncateChatPreview(replyTo.content);

  return (
    <div className="flex items-start gap-2 px-4 py-2 bg-secondary/60 border-l-2 border-primary rounded-r-md">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary truncate">
          {t("replyingTo")} {senderName}
        </p>
        <p className="text-xs text-muted-foreground truncate">{preview}</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label={t("cancelReply")}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
