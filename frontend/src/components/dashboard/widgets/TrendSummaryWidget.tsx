"use client";

import { useState, useTransition, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import Link from "next/link";
import { TimeRangeSelector } from "@/components/charts/TimeRangeSelector";
import { cn } from "@/lib/utils";
import type { ReportPeriod, TrendAnalysis } from "@/types/api";

async function fetchTrend(metric: string, period: ReportPeriod): Promise<TrendAnalysis | null> {
  const res = await fetch(`/api/v1/reports/trends?metric=${metric}&period=${period}`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

interface MetricDef { key: string; label: string; unit: string; color: string; scale?: number }

const METRICS: MetricDef[] = [
  { key: "heart_rate", label: "Nhịp tim",  unit: "bpm",  color: "#ef4444" },
  { key: "steps",      label: "Bước chân", unit: "bước", color: "#3b82f6" },
  { key: "sleep",      label: "Giấc ngủ",  unit: "giờ",  color: "#8b5cf6", scale: 1 / 60 },
  { key: "calories",   label: "Calo",       unit: "kcal", color: "#f97316" },
  { key: "weight",     label: "Cân nặng",  unit: "kg",   color: "#f59e0b" },
];

const TREND_ICON = {
  improving: TrendingUp,
  declining: TrendingDown,
  stable:    Minus,
};

interface Props { initialPeriod?: ReportPeriod }

export function TrendSummaryWidget({ initialPeriod = "7d" }: Props) {
  const t      = useTranslations("dashboard.trends");
  const locale = useLocale();
  const [period,    setPeriod]    = useState<ReportPeriod>(initialPeriod);
  const [trends,    setTrends]    = useState<Record<string, TrendAnalysis>>({});
  const [isPending, startTransition] = useTransition();

  const loadTrends = (p: ReportPeriod) => {
    startTransition(async () => {
      const results = await Promise.all(METRICS.map((m) => fetchTrend(m.key, p)));
      const map: Record<string, TrendAnalysis> = {};
      METRICS.forEach((m, i) => { if (results[i]) map[m.key] = results[i]!; });
      setTrends(map);
    });
  };

  useEffect(() => { loadTrends(period); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handlePeriodChange = (p: ReportPeriod | "custom") => {
    if (p === "custom") return;
    setPeriod(p);
    loadTrends(p);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{t("title")}</p>
            <p className="text-[11px] text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <TimeRangeSelector value={period} onChange={handlePeriodChange} />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-5 py-4">
        {isPending ? (
          /* Loading skeleton */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {METRICS.map((m) => (
              <div key={m.key} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: m.color }} />
                  <div className="w-4 h-4 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                <div className="h-5 w-20 rounded bg-muted animate-pulse" />
                <div className="h-3 w-10 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : Object.keys(trends).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("noData")}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {METRICS.map((m) => {
              const data = trends[m.key];
              if (!data) return (
                <div key={m.key} className="rounded-lg border border-border p-3 opacity-40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-bold text-muted-foreground mt-0.5">--</p>
                </div>
              );

              const Icon     = TREND_ICON[data.trend] ?? Minus;
              const sign     = data.change_percent > 0 ? "+" : "";
              const lastPt   = data.data_points.at(-1);
              const rawVal   = lastPt?.value ?? null;
              // Apply optional scale (sleep: minutes → hours)
              const dispVal  = rawVal != null
                ? m.scale != null
                  ? (rawVal * m.scale).toFixed(1)
                  : rawVal >= 1000
                    ? (rawVal / 1000).toFixed(1) + "k"
                    : rawVal.toLocaleString()
                : "--";

              const trendColor =
                data.trend === "improving" ? "text-emerald-500"
                : data.trend === "declining" ? "text-destructive"
                : "text-muted-foreground";

              return (
                <Link
                  key={m.key}
                  href={`/${locale}/dashboard/reports/trends?metric=${m.key}&period=${period}`}
                  className="rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    <Icon className={cn("w-3.5 h-3.5 transition-transform group-hover:scale-110", trendColor)} />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-none">{m.label}</p>
                  <p className="text-lg font-bold text-foreground tabular-nums mt-1 leading-none">
                    {dispVal}
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">{m.unit}</span>
                  </p>
                  <p className={cn("text-[10px] font-medium mt-1 leading-none", trendColor)}>
                    {sign}{data.change_percent.toFixed(1)}%
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
