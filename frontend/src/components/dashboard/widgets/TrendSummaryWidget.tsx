"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import Link from "next/link";
import { TimeRangeSelector } from "@/components/charts/TimeRangeSelector";
import { fetchTrendAnalysisBatch } from "@/lib/reports-trends-client";
import { cn } from "@/lib/utils";
import type { ReportPeriod, TrendAnalysis } from "@/types/api";

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

// ── Mini sparkline SVG ─────────────────────────────────────────────────────────
function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;

  const W = 64, H = 24;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastX = W;
  const lastY = H - ((points[points.length - 1] - min) / range) * (H - 4) - 2;
  const gradId = `sg${color.replace("#", "")}`;

  const areaPath = `M0,${H} L${coords.join(" L")} L${lastX},${H} Z`;
  const linePath = `M${coords.join(" L")}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY.toFixed(1)} r="2.5" fill={color} />
    </svg>
  );
}

interface Props { initialPeriod?: ReportPeriod }

export function TrendSummaryWidget({ initialPeriod = "7d" }: Props) {
  const t      = useTranslations("dashboard.trends");
  const locale = useLocale();
  const [period,    setPeriod]    = useState<ReportPeriod>(initialPeriod);
  const [trends,    setTrends]    = useState<Record<string, TrendAnalysis>>({});
  const [isPending, startTransition] = useTransition();
  const latestTrendRequestId = useRef(0);

  const loadTrends = useCallback((p: ReportPeriod) => {
    const requestId = latestTrendRequestId.current + 1;
    latestTrendRequestId.current = requestId;
    startTransition(async () => {
      const data = await fetchTrendAnalysisBatch(METRICS.map((m) => m.key), p);
      if (latestTrendRequestId.current === requestId) {
        setTrends(data);
      }
    });
  }, [startTransition]);

  useEffect(() => { loadTrends(period); }, [loadTrends, period]);

  const handlePeriodChange = (p: ReportPeriod | "custom") => {
    if (p === "custom") return;
    setPeriod(p);
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
                  <div className="w-12 h-4 rounded-full bg-muted animate-pulse" />
                </div>
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                <div className="h-5 w-20 rounded bg-muted animate-pulse" />
                <div className="h-6 w-full rounded bg-muted animate-pulse opacity-40" />
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

              const Icon   = TREND_ICON[data.trend] ?? Minus;
              const sign   = data.change_percent > 0 ? "+" : "";
              const lastPt = data.data_points.at(-1);
              const rawVal = lastPt?.value ?? null;

              // Apply optional scale (sleep: minutes → hours)
              const dispVal = rawVal != null
                ? m.scale != null
                  ? (rawVal * m.scale).toFixed(1)
                  : rawVal >= 1000
                    ? (rawVal / 1000).toFixed(1) + "k"
                    : rawVal.toLocaleString()
                : "--";

              // Sparkline data points (scaled)
              const sparkPts = data.data_points
                .map((p) => m.scale != null ? p.value * m.scale : p.value);

              const trendColor =
                data.trend === "improving" ? "text-emerald-500"
                : data.trend === "declining" ? "text-destructive"
                : "text-muted-foreground";

              const trendPillBg =
                data.trend === "improving"
                  ? "bg-emerald-50 dark:bg-emerald-950/30"
                  : data.trend === "declining"
                    ? "bg-red-50 dark:bg-red-950/30"
                    : "bg-muted/50";

              return (
                <Link
                  key={m.key}
                  href={`/${locale}/dashboard/reports/trends?metric=${m.key}&period=${period}`}
                  className="rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors group flex flex-col"
                >
                  {/* Top row: dot + trend pill */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                    <div className={cn(
                      "flex items-center gap-0.5 rounded-full px-1.5 py-0.5",
                      trendPillBg,
                    )}>
                      <Icon className={cn("w-3 h-3 transition-transform group-hover:scale-110 flex-shrink-0", trendColor)} />
                      <span className={cn("text-[9px] font-bold tabular-nums", trendColor)}>
                        {sign}{data.change_percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Label */}
                  <p className="text-[11px] text-muted-foreground leading-none">{m.label}</p>

                  {/* Value */}
                  <p className="text-lg font-bold text-foreground tabular-nums mt-1 leading-none">
                    {dispVal}
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">{m.unit}</span>
                  </p>

                  {/* Sparkline */}
                  <div className="mt-2 flex justify-start">
                    <Sparkline points={sparkPts} color={m.color} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
