"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { getInitials, formatChatTime } from "@/lib/chat-utils";
import { UserX, UserCheck, Shield } from "lucide-react";
import type { StrangerRequest } from "@/types/api";
import { useLocale } from "next-intl";

interface StrangerRequestsProps {
  requests: StrangerRequest[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onBlock: (id: string) => void;
}

export function StrangerRequests({
  requests,
  onAccept,
  onReject,
  onBlock,
}: StrangerRequestsProps) {
  const t = useTranslations("chat");
  const locale = useLocale();

  const pending = requests.filter((r) => r.status === "pending");

  if (pending.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="size-16 rounded-full bg-secondary flex items-center justify-center">
          <Shield className="size-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t("noStrangers")}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {pending.map((req) => (
        <li key={req.id} className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-10 flex-shrink-0">
              <AvatarFallback className="bg-orange-100 text-orange-700 text-sm font-semibold">
                {getInitials(req.from_user.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold truncate">{req.from_user.display_name}</p>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {formatChatTime(req.created_at, locale)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{req.from_user.email}</p>
              <p className="text-sm text-foreground mt-1 line-clamp-2">{req.message_preview}</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                {t("strangerInfo")}
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onAccept(req.id)}
                  className="h-8 px-3 gap-1.5 text-xs"
                >
                  <UserCheck className="size-3.5" />
                  {t("accept")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(req.id)}
                  className="h-8 px-3 gap-1.5 text-xs"
                >
                  <UserX className="size-3.5" />
                  {t("reject")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onBlock(req.id)}
                  className="h-8 px-3 gap-1.5 text-xs text-destructive hover:text-destructive"
                >
                  <Shield className="size-3.5" />
                  {t("block")}
                </Button>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
