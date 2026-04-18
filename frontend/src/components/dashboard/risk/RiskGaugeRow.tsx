"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskItem, RiskLevel, RiskTrend } from "@/types/api";
import { PreventionTipList } from "@/components/dashboard/risk/PreventionTipList";

interface RiskGaugeRowProps {
  risk: RiskItem;
  defaultExpanded?: boolean;
}

const IMPACT_COLORS = {
  positive: "text-green-500",
  negative: "text-red-400",
  neutral: "text-muted-foreground",
};

const IMPACT_SYMBOLS = {
  positive: "+",
  negative: "–",
  neutral: "·",
};

/** Manual lookup for API-returned Vietnamese disease names — REMOVED */

export function RiskGaugeRow({ risk, defaultExpanded = false }: RiskGaugeRowProps) {
  const t = useTranslations("dashboard.risk");
  const [expanded, setExpanded] = useState(defaultExpanded);

  const LEVEL_CONFIG: Record<RiskLevel, { color: string; trackColor: string; bg: string }> = {
    low: {
      color: "#4ADE80",
      trackColor: "bg-green-400",
      bg: "bg-green-400/10",
    },
    moderate: {
      color: "#FBBF24",
      trackColor: "bg-amber-400",
      bg: "bg-amber-400/10",
    },
    high: {
      color: "#F97316",
      trackColor: "bg-orange-500",
      bg: "bg-orange-500/10",
    },
    critical: {
      color: "#EF4444",
      trackColor: "bg-red-500",
      bg: "bg-red-500/10",
    },
  };

  const TREND_CONFIG: Record<RiskTrend, { icon: React.ElementType; labelKey: string; color: string }> = {
    improving: { icon: TrendingDown, labelKey: "trend.improving", color: "text-green-500" },
    stable: { icon: Minus, labelKey: "trend.stable", color: "text-muted-foreground" },
    worsening: { icon: TrendingUp, labelKey: "trend.worsening", color: "text-orange-500" },
  };

  const cfg = LEVEL_CONFIG[risk.level];
  const trendCfg = TREND_CONFIG[risk.trend];
  const TrendIcon = trendCfg.icon;
  const pct = Math.round(risk.probability * 100);
  const conditionName = risk.conditionCode
    ? t.has(`conditions.${risk.conditionCode}` as never)
      ? t(`conditions.${risk.conditionCode}` as never)
      : risk.condition
    : risk.condition;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card overflow-hidden transition-shadow",
        expanded && "shadow-sm"
      )}
      role="region"
      aria-label={`Risk: ${conditionName}`}
    >
      {/* Summary row — clickable to expand */}
      <button
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/40 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {/* Probability circle */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 font-bold text-sm"
          style={{ borderColor: cfg.color, color: cfg.color }}
        >
          {pct}%
        </div>

        {/* Name + progress bar */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground leading-none">
              {conditionName}
            </p>
            {risk.icdCode && (
              <span className="text-[10px] text-muted-foreground font-mono border border-border rounded px-1">
                {risk.icdCode}
              </span>
            )}
          </div>

          {/* Bar track */}
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", cfg.trackColor)}
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${conditionName}: ${pct}%`}
            />
          </div>
        </div>

        {/* Badges */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              cfg.bg
            )}
            style={{ color: cfg.color }}
          >
            {t(`level.${risk.level}`)}
          </span>
          <span
            className={cn("inline-flex items-center gap-1 text-[11px] font-medium", trendCfg.color)}
          >
            <TrendIcon className="w-3 h-3" />
            {t(trendCfg.labelKey)}
          </span>
        </div>

        {/* Expand chevron */}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-1",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-border px-5 pb-5 space-y-4">
          {/* Contributing factors */}
          <div className="pt-4">
            <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
              {t("factors")}
            </p>
            <ul className="space-y-2">
              {risk.factors.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "flex-shrink-0 text-sm font-bold leading-none mt-0.5",
                      IMPACT_COLORS[f.impact]
                    )}
                  >
                    {IMPACT_SYMBOLS[f.impact]}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-foreground">
                      {t.has(`factorLabels.${f.label}` as never)
                        ? t(`factorLabels.${f.label}` as never)
                        : f.label}:{" "}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {f.detail === "NO_DATA"
                        ? t("factorLabels.NO_DATA" as never)
                        : f.detail}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Prevention tips */}
          {risk.tips.length > 0 && (
            <div className="border-t border-border pt-4">
              <PreventionTipList tips={risk.tips} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
