"use client";

/**
 * ConnectionStatusBanner — a single, deterministic surface that explains the
 * current chat transport state to the user.
 *
 * Priority order (only the highest-priority banner is shown at a time):
 *   1. Session expired (WS code 4001) — requires user action to re-auth.
 *   2. Browser offline                 — blocks all network calls.
 *   3. WS reconnecting after a drop    — transient, will self-recover.
 *
 * The banner is intentionally non-dismissible: the failure mode is the message.
 * If the underlying state clears, the banner disappears on its own.
 */

import { useTranslations } from "next-intl";
import { Loader2, WifiOff, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ConnectionStatusBannerProps {
  isOnline: boolean;
  isReconnecting: boolean;
  sessionExpired: boolean;
  onReconnect?: () => void;
  /** Where to send the user to re-authenticate. */
  signInHref?: string;
  className?: string;
}

export function ConnectionStatusBanner({
  isOnline,
  isReconnecting,
  sessionExpired,
  onReconnect,
  signInHref = "/auth/login",
  className,
}: ConnectionStatusBannerProps) {
  const t = useTranslations("chat.connection");

  if (sessionExpired) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-xs font-medium",
          "border-b border-destructive/30 bg-destructive/10 text-destructive",
          className
        )}
      >
        <ShieldAlert className="size-3.5 flex-shrink-0" aria-hidden />
        <span className="flex-1 truncate">{t("sessionExpired")}</span>
        <Link
          href={signInHref}
          className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          {t("signInAgain")}
        </Link>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <output
        aria-live="polite"
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-xs font-medium",
          "border-b border-amber-300/40 bg-amber-100/70 text-amber-900",
          "dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
          className
        )}
      >
        <WifiOff className="size-3.5 flex-shrink-0" aria-hidden />
        <span className="flex-1 truncate">{t("offline")}</span>
      </output>
    );
  }

  if (isReconnecting) {
    return (
      <output
        aria-live="polite"
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-xs font-medium",
          "border-b border-border bg-muted/70 text-muted-foreground",
          className
        )}
      >
        <Loader2 className="size-3.5 flex-shrink-0 animate-spin" aria-hidden />
        <span className="flex-1 truncate">{t("reconnecting")}</span>
        {onReconnect && (
          <button
            type="button"
            onClick={onReconnect}
            className="rounded-md border border-border bg-background px-2 py-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("reconnectNow")}
          </button>
        )}
      </output>
    );
  }

  return null;
}
