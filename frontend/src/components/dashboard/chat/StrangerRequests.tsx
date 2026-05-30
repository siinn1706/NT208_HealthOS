"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { getInitials, formatChatTime } from "@/lib/chat-utils";
import { UserX, UserCheck, Shield, Users } from "lucide-react";
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
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <Shield className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t("noStrangers")}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {pending.map((req) => {
        const isGroup = req.conversation_type === "group";
        const title = isGroup
          ? (req.group_title ?? t("strangerRequest"))
          : req.from_user.display_name;
        // For a group invite the secondary line shows member count; for a
        // stranger DM it shows the inviter's email.
        const subtitle = isGroup
          ? t("members", { count: req.member_count ?? 0 })
          : req.from_user.email;

        return (
          <li key={req.id} className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10 flex-shrink-0">
                {isGroup && req.group_avatar_url ? (
                  <AvatarImage src={req.group_avatar_url} alt={title} />
                ) : null}
                <AvatarFallback
                  className={
                    isGroup
                      ? "bg-blue-100 text-blue-700 text-sm font-semibold"
                      : "bg-orange-100 text-orange-700 text-sm font-semibold"
                  }
                >
                  {isGroup ? <Users className="w-5 h-5" /> : getInitials(req.from_user.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold truncate">{title}</p>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {formatChatTime(req.created_at, locale)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                {req.message_preview ? (
                  <p className="text-sm text-foreground mt-1 line-clamp-2">{req.message_preview}</p>
                ) : null}
                {!isGroup ? (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    {t("strangerInfo")}
                  </p>
                ) : null}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onAccept(req.id)}
                    className="h-8 px-3 gap-1.5 text-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {t("accept")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReject(req.id)}
                    className="h-8 px-3 gap-1.5 text-xs"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    {t("reject")}
                  </Button>
                  {/* Block is a stranger-DM concept; not shown for group invites. */}
                  {!isGroup ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onBlock(req.id)}
                      className="h-8 px-3 gap-1.5 text-xs text-destructive hover:text-destructive"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      {t("block")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
