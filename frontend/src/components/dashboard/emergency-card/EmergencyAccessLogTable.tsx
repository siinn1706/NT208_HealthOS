/**
 * EmergencyAccessLogTable — last N public-card scans, owner-scoped.
 *
 * Server-side paginated; the dashboard page passes the initial 50 rows.
 * The "Refresh" button refetches via the BFF in case a new scan happened
 * since the page loaded.
 */
"use client";

import { Activity, Clock, Globe, Loader2, RefreshCw } from "lucide-react";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate, formatTime } from "@/lib/format-utils";
import type { EmergencyAccessLog } from "@/lib/emergency-card-types";

interface EmergencyAccessLogTableProps {
  initialLogs: EmergencyAccessLog[];
}

// L9 — broaden the UA matcher to cover Android WebView, AOSP browser,
// in-hospital tablet identifiers, and the common "Mobile/15E148 Safari"
// suffix. We keep this inline (no UA-parser dependency) — the table
// only needs human-readable hints, not perfect identification.
const _UA_HINTS: readonly RegExp[] = [
  /Edg(?:e|A|iOS)?\/[\d.]+/,         // Edge desktop / mobile (must run before Chrome)
  /OPR\/[\d.]+/,                      // Opera
  /YaBrowser\/[\d.]+/,                // Yandex
  /SamsungBrowser\/[\d.]+/,
  /Firefox\/[\d.]+/,
  /Chrome\/[\d.]+/,
  /Version\/[\d.]+ Mobile.*Safari/,   // iOS Safari shows Version/X then Safari/Y
  /Safari\/[\d.]+/,
  /CriOS\/[\d.]+/,                    // Chrome on iOS
  /FxiOS\/[\d.]+/,                    // Firefox on iOS
  /\bwv\b/,                           // Android WebView marker
];

function shortUserAgent(ua: string | null | undefined): string {
  if (!ua) return "—";
  for (const rx of _UA_HINTS) {
    const m = ua.match(rx);
    if (m) return m[0];
  }
  return ua.slice(0, 40);
}

export function EmergencyAccessLogTable({ initialLogs }: EmergencyAccessLogTableProps) {
  const t = useTranslations("dashboard.emergencyCard.accessLog");
  const locale = useLocale();
  const [logs, setLogs] = React.useState(initialLogs);
  const [refreshing, setRefreshing] = React.useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(
        "/api/v1/users/me/emergency-profile/access-logs?limit=50",
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("refresh-failed");
      const json = await res.json().catch(() => null);
      const next = (json?.data as EmergencyAccessLog[] | undefined) ?? null;
      if (next) setLogs(next);
    } catch {
      toast.error(t("refreshFailed"));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("title")}</p>
          <p className="text-xs text-muted-foreground">
            {t("subtitle", { count: logs.length })}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-1.5"
        >
          {refreshing ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          {t("refresh")}
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <Activity className="mx-auto size-5 text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm text-muted-foreground">{t("emptyTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("emptyBody")}</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[400px] rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-start gap-3 px-3 py-2.5 text-sm"
              >
                <div className="mt-0.5">
                  <Clock className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {formatDate(log.accessed_at, locale)}{" "}
                    <span className="font-normal text-muted-foreground">
                      {formatTime(log.accessed_at, locale)}
                    </span>
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {log.ip_truncated && (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Globe className="size-3" aria-hidden /> {log.ip_truncated}
                      </span>
                    )}
                    <span className="truncate">{shortUserAgent(log.user_agent)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
