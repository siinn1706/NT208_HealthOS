"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import {
  Bell, AlertTriangle, X, Wifi, WifiOff, ChevronRight,
  Heart, Activity, Footprints, Moon, Scale, ShieldCheck, TrendingUp, TrendingDown,
} from "lucide-react";
import { useHealthAlerts } from "@/hooks/useHealthAlerts";
import { fetchTrendAnalysisBatch } from "@/lib/reports-trends-client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AnomalyPoint } from "@/types/api";
import { AiAdvicePanel } from "./AiAdvicePanel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MetricAnomalyData {
  metric: string;
  metricLabel: string;
  unit: string;
  anomalies: ExtendedAnomaly[];
}

type ExtendedAnomaly = AnomalyPoint & { metric: string; metricLabel: string; unit: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_METRICS = [
  { key: "heart_rate",     label: "Nhịp tim",  Icon: Heart,      color: "#ef4444", high: 100, low: 60,  unit: "bpm"   },
  { key: "blood_pressure", label: "Huyết áp",  Icon: Activity,   color: "#f97316", high: 140,            unit: "mmHg"  },
  { key: "steps",          label: "Bước chân", Icon: Footprints, color: "#3b82f6",            low: 5000, unit: "bước"  },
  { key: "sleep",          label: "Giấc ngủ",  Icon: Moon,       color: "#8b5cf6",            low: 360,  unit: "phút"  },
  { key: "weight",         label: "Cân nặng",  Icon: Scale,      color: "#f59e0b",                       unit: "kg"    },
] as const;

type MetricKey = typeof ALL_METRICS[number]["key"];

function findMetricMeta(key: string) {
  return ALL_METRICS.find((m) => m.key === key);
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchAllAnomalies(): Promise<MetricAnomalyData[]> {
  const emptyResults = () =>
    ALL_METRICS.map((m) => ({
      metric: m.key,
      metricLabel: m.label,
      unit: m.unit,
      anomalies: [],
  }));

  try {
    const batch = await fetchTrendAnalysisBatch(ALL_METRICS.map((m) => m.key), "30d");
    return ALL_METRICS.map((m) => {
      const data = batch?.[m.key];
      // Always use static Vietnamese label, not the API i18n key.
      return {
        metric: m.key,
        metricLabel: m.label,
        unit: m.unit,
        anomalies: (data?.anomalies ?? []).map((a) => ({
          ...a,
          metric: m.key,
          metricLabel: m.label,
          unit: m.unit,
        })),
      } satisfies MetricAnomalyData;
    });
  } catch {
    return emptyResults();
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCountBar({ count, max, color }: { count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((count / max) * 100, 100) : 0;
  return (
    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: pct > 0 ? color : "transparent" }}
      />
    </div>
  );
}

function DeviationPill({ dev, severity }: { dev: number; severity: "critical" | "warning" }) {
  const isCrit = severity === "critical";
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0",
      isCrit
        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    )}>
      {dev > 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
      {dev > 0 ? "+" : ""}{dev.toFixed(0)}%
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function RealtimeAnomalyWidget() {
  const t      = useTranslations("dashboard.anomalies");
  // No `enabled` arg needed: this component lives inside the (app) layout which
  // server-redirects unauthenticated users before render. useChatWs handles any
  // residual unauthenticated cases autonomously — fetchToken() failure sets
  // status="error" without opening a socket; code 4001 sets sessionExpired=true
  // and stops retrying. Default enabled=true is therefore safe here.
  const { alerts: rtAlerts, dismissAlert, status } = useHealthAlerts();

  const [metricData, setMetricData] = useState<MetricAnomalyData[]>([]);
  const [loaded,     setLoaded]     = useState(false);
  const [isPending,  startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await fetchAllAnomalies();
      setMetricData(data);
      setLoaded(true);
    });
  }, []);

  const allAnomalies = useMemo(
    () => metricData.flatMap((m) => m.anomalies).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4),
    [metricData],
  );

  const critCount = allAnomalies.filter((a) => a.severity === "critical").length;
  const warnCount = allAnomalies.filter((a) => a.severity === "warning").length;
  const maxCount  = Math.max(...metricData.map((m) => m.anomalies.length), 1);
  const hasRt     = rtAlerts.length > 0;
  const hasHist   = allAnomalies.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shrink-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "size-6 rounded-md flex items-center justify-center flex-shrink-0",
            critCount > 0 ? "bg-red-100 dark:bg-red-900/20" : hasHist ? "bg-amber-100 dark:bg-amber-900/20" : "bg-emerald-100 dark:bg-emerald-900/20",
          )}>
            {!hasHist && loaded
              ? <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
              : <Bell className={cn("size-3.5", critCount > 0 ? "text-red-500 animate-pulse" : hasHist ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400")} aria-hidden />
            }
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{t("title")}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{t("subtitle")}</p>
          </div>
        </div>
        {/* WS status */}
        <span className={cn(
          "flex items-center gap-1 text-[10px] flex-shrink-0 ml-2",
          status === "connected" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
        )}>
          {status === "connected" ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
          <span>{status === "connected" ? t("live") : t("offline")}</span>
        </span>
      </div>

      {/* ── Body (fixed frame, scrollable) ── */}
      <div className="px-4 py-3 space-y-3 min-h-[260px] max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">

        {/* ── Loading skeleton ── */}
        {isPending && !loaded && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
            </div>
            <div className="space-y-1.5">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-4 rounded bg-muted animate-pulse" />)}
            </div>
          </div>
        )}

        {loaded && (
          <>
            {/* ── All-clear banner + AI advice ── */}
            {!hasRt && !hasHist ? (
              <div className="flex flex-col gap-3">
                {/* All-clear status */}
                <div className="flex items-center gap-2.5 py-1">
                  <div className="size-7 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-xs text-muted-foreground">{t("allClear")}</p>
                </div>

                <AiAdvicePanel />
              </div>
            ) : (
              <>
                {/* ── Stats strip ── */}
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="rounded-lg border bg-red-50/60 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40 py-2 text-center">
                    <p className="text-base font-bold tabular-nums text-red-500 leading-none">{critCount}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-none">{t("statCritical")}</p>
                  </div>
                  <div className="rounded-lg border bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 py-2 text-center">
                    <p className="text-base font-bold tabular-nums text-amber-500 leading-none">{warnCount}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-none">{t("statWarning")}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 border-border py-2 text-center">
                    <p className="text-base font-bold tabular-nums text-foreground leading-none">{critCount + warnCount}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-none">{t("statTotal")}</p>
                  </div>
                </div>

                {/* ── Real-time alerts ── */}
                {hasRt && (
                  <div role="alert" aria-live="polite" className="space-y-1.5">
                    <p className="text-[9px] font-semibold text-red-500 uppercase tracking-widest">{t("realtimeSection")}</p>
                    {rtAlerts.slice(0, 2).map((a) => (
                      <div key={a.id} className={cn(
                        "flex items-start gap-2 p-2 rounded-lg border text-xs",
                        a.type === "critical"
                          ? "bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/40 text-red-700 dark:text-red-400"
                          : "bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/40 text-amber-700 dark:text-amber-400",
                      )}>
                        <AlertTriangle className="size-3.5 mt-0.5 flex-shrink-0" />
                        <span className="flex-1 leading-relaxed">{a.message}</span>
                        <button type="button" onClick={() => dismissAlert(a.id)} aria-label={t("dismiss")} className="opacity-60 hover:opacity-100 transition-opacity">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Per-metric breakdown ── */}
                <div className="space-y-1">
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">{t("metricBreakdown")}</p>
                  {ALL_METRICS.map((m) => {
                    const mData = metricData.find((d) => d.metric === m.key);
                    const count = mData?.anomalies.length ?? 0;
                    return (
                      <div key={m.key} className="flex items-center gap-2">
                        <m.Icon className="size-3 flex-shrink-0" style={{ color: m.color }} aria-hidden />
                        <span className="text-[10px] text-muted-foreground w-[64px] flex-shrink-0 truncate">{m.label}</span>
                        <MetricCountBar count={count} max={maxCount} color={m.color} />
                        <span className={cn(
                          "text-[10px] font-semibold tabular-nums flex-shrink-0 w-4 text-right",
                          count > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/40",
                        )}>{count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* ── Recent anomaly timeline ── */}
                {hasHist && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">{t("recentSection")}</p>
                    {allAnomalies.map((a, i) => {
                      const m       = findMetricMeta(a.metric as MetricKey);
                      const color   = m?.color ?? "#94a3b8";
                      const isCrit  = a.severity === "critical";
                      const threshHi = m && "high" in m ? (m as { high?: number }).high : undefined;
                      const threshLo = m && "low"  in m ? (m as { low?: number  }).low  : undefined;

                      return (
                        <div key={`${a.date}-${i}`} className={cn(
                          "flex items-start gap-2 p-2 rounded-lg bg-muted/20 dark:bg-muted/10 border-l-[3px]",
                          isCrit ? "border-l-red-500" : "border-l-amber-400",
                        )}>
                          {/* Icon bubble */}
                          <div className="flex-shrink-0 size-5 rounded-full flex items-center justify-center mt-0.5"
                            style={{ background: `${color}22` }}>
                            {m && <m.Icon className="size-2.5" style={{ color }} aria-hidden />}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Top row */}
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <time className="text-[9px] font-mono text-muted-foreground flex-shrink-0">{a.date}</time>
                                <span className="text-[10px] font-semibold text-foreground truncate">{a.metricLabel}</span>
                              </div>
                              <DeviationPill dev={a.deviation_percent} severity={a.severity} />
                            </div>

                            {/* Value + threshold */}
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs font-bold tabular-nums" style={{ color }}>
                                {a.value} {a.unit}
                              </span>
                              {threshHi != null && a.value > threshHi && (
                                <span className="text-[9px] text-muted-foreground">ngưỡng &gt; {threshHi}</span>
                              )}
                              {threshLo != null && a.value < threshLo && (
                                <span className="text-[9px] text-muted-foreground">ngưỡng &lt; {threshLo}</span>
                              )}
                            </div>

                            {/* Deviation bar + badge */}
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all duration-700", isCrit ? "bg-red-400" : "bg-amber-400")}
                                  style={{ width: `${Math.min(Math.abs(a.deviation_percent) * 2, 100)}%` }}
                                />
                              </div>
                              <Badge
                                variant={isCrit ? "destructive" : "secondary"}
                                className="text-[9px] px-1.5 py-0 h-4 flex-shrink-0"
                              >
                                {isCrit ? t("critical") : t("warning")}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <AiAdvicePanel compact />
              </>
            )}
          </>
        )}

        {/* ── Footer ── */}
        <Link
          href={`/dashboard/reports/trends`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline transition-colors pt-0.5"
        >
          {t("viewAll")}
          <ChevronRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
