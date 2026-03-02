"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { MOCK_USERS, CURRENT_USER_ID } from "@/data/chat";
import type { Message } from "@/types/api";

interface MessageReplyPreviewProps {
  replyTo: Pick<Message, "id" | "content" | "sender_id" | "type">;
  onCancel: () => void;
  /** shown in input bar */
  mode?: "input";
}

export function MessageReplyPreview({ replyTo, onCancel }: MessageReplyPreviewProps) {
  const t = useTranslations("chat");

  const senderName =
    replyTo.sender_id === CURRENT_USER_ID
      ? t("you")
      : replyTo.sender_id === "ai"
      ? t("aiAssistant")
      : MOCK_USERS.find((u) => u.user_id === replyTo.sender_id)?.display_name ?? "Unknown";

  const preview =
    replyTo.type === "image"
      ? "[Ảnh]"
      : replyTo.type === "file"
      ? "[File]"
      : replyTo.content.length > 80
      ? replyTo.content.slice(0, 80) + "…"
      : replyTo.content;

  return (
    <div className="flex items-start gap-2 px-4 py-2 bg-secondary/60 border-l-2 border-primary rounded-r-md">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary truncate">{t("replyingTo")} {senderName}</p>
        <p className="text-xs text-muted-foreground truncate">{preview}</p>
      </div>
      <button
        onClick={onCancel}
        aria-label={t("cancelReply")}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
