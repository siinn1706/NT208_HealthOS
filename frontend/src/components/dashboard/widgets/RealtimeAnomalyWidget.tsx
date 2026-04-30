"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  X,
  Wifi,
  WifiOff,
  ChevronRight,
} from "lucide-react";
import { useHealthAlerts } from "@/hooks/useHealthAlerts";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AnomalyPoint, TrendAnalysis, ReportPeriod } from "@/types/api";

// Reuse existing BFF proxy
async function fetchRecentAnomalies(
  period: ReportPeriod = "7d",
): Promise<AnomalyPoint[]> {
  const metrics = ["heart_rate", "steps", "sleep", "blood_pressure", "weight"];
  const results = await Promise.all(
    metrics.map(async (m) => {
      const res = await fetch(
        `/api/v1/reports/trends?metric=${m}&period=${period}`,
        { credentials: "include" },
      );
      if (!res.ok) return [];
      const json = await res.json();
      const data = json?.data as TrendAnalysis | undefined;
      return (data?.anomalies ?? []).map((a) => ({
        ...a,
        metric: data?.metric_label ?? m,
        unit: data?.unit ?? "",
      }));
    }),
  );
  return results
    .flat()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
}

type ExtendedAnomaly = AnomalyPoint & { metric?: string; unit?: string };

export function RealtimeAnomalyWidget() {
  const t = useTranslations("dashboard.anomalies");
  const locale = useLocale();

  // ── Real-time: WebSocket alerts (hook đã có) ──
  const { alerts: realtimeAlerts, dismissAlert, status } = useHealthAlerts();

  // ── Historical: fetch recent anomalies from trends API ──
  const [historicalAnomalies, setHistoricalAnomalies] = useState<
    ExtendedAnomaly[]
  >([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const anomalies = await fetchRecentAnomalies("30d");
      setHistoricalAnomalies(anomalies);
    });
  }, []);

  const hasRealtime = realtimeAlerts.length > 0;
  const hasHistorical = historicalAnomalies.length > 0;

  if (!hasRealtime && !hasHistorical && !isPending) return null;

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
              hasRealtime
                ? "bg-destructive/10"
                : "bg-amber-100 dark:bg-amber-900/20",
            )}
          >
            <Bell
              className={cn(
                "w-4 h-4",
                hasRealtime
                  ? "text-destructive"
                  : "text-amber-600 dark:text-amber-400",
              )}
              aria-hidden
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("title")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "connected" ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              <Wifi className="w-3 h-3" />
              {t("live")}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <WifiOff className="w-3 h-3" />
              {t("offline")}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* ── Section A: Real-time alerts ── */}
        {hasRealtime && (
          <div role="alert" aria-live="polite" className="space-y-2">
            <p className="text-[10px] font-semibold text-destructive uppercase tracking-wide">
              {t("realtimeSection")}
            </p>
            {realtimeAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-2 p-2.5 rounded-lg border text-xs",
                  alert.type === "critical"
                    ? "bg-destructive/5 border-destructive/30 text-destructive"
                    : "bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/40 text-amber-700 dark:text-amber-400",
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span className="flex-1">{alert.message}</span>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  aria-label={t("dismiss")}
                  className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Section B: Historical anomalies ── */}
        {isPending ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : hasHistorical ? (
          <div className="space-y-2">
            {!hasRealtime && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t("recentSection")}
              </p>
            )}
            {historicalAnomalies.map((a, i) => {
              const isCritical = a.severity === "critical";
              return (
                <div
                  key={`${a.date}-${i}`}
                  className="flex items-center gap-2.5 text-xs"
                >
                  <AlertTriangle
                    className={cn(
                      "w-3.5 h-3.5 flex-shrink-0",
                      isCritical ? "text-destructive" : "text-amber-500",
                    )}
                  />
                  <time className="text-[10px] font-mono text-muted-foreground w-20 flex-shrink-0">
                    {a.date}
                  </time>
                  <span className="flex-1 text-foreground truncate">
                    {a.metric ?? ""}: <strong className="tabular-nums">{a.value}</strong> {a.unit ?? ""}
                  </span>
                  <Badge
                    variant={isCritical ? "destructive" : "secondary"}
                    className="text-[9px] px-1 py-0 flex-shrink-0"
                  >
                    {a.deviation_percent > 0 ? "+" : ""}
                    {a.deviation_percent.toFixed(0)}%
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Link to full trends page */}
        <Link
          href={`/${locale}/dashboard/reports/trends`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline transition-colors"
        >
          {t("viewAll")}
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}