"use client";

import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";

export function ChatEmptyState() {
  const t = useTranslations("chat");

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <MessageCircle className="w-10 h-10 text-primary/40" />
      </div>
      <div>
        <p className="text-base font-medium text-foreground">{t("title")}</p>
        <p className="text-sm text-muted-foreground mt-1">{t("noConversation")}</p>
      </div>
    </div>
  );
}
