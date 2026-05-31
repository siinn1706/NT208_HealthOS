"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnection } from "@/components/providers/offline-provider";

/**
 * Compact connection status pill for top nav / app shell chrome.
 * Shows nothing when online and not in a "reconnecting" transient state.
 */
export function OfflineIndicator({ className }: { className?: string }) {
  const { status } = useConnection();
  const t = useTranslations("state");

  if (status === "online") return null;

  // Both states share the same warning-tinted pill; only the icon + label change.
  const pillClass = cn(
    "inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning",
    className,
  );

  if (status === "reconnecting") {
    return (
      <output aria-live="polite" className={pillClass}>
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        {t("reconnecting")}
      </output>
    );
  }

  return (
    <output aria-live="polite" className={pillClass}>
      <WifiOff className="size-3" aria-hidden="true" />
      {t("offline")}
    </output>
  );
}
