import { getTranslations } from "next-intl/server";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SectionStats } from "@/types/api";
import { trendColor } from "@/lib/report-utils";

interface KeyStatsRowProps {
  stats: SectionStats;
}

export async function KeyStatsRow({ stats }: KeyStatsRowProps) {
  const t = await getTranslations("reports.stats");

  const TrendIcon =
    stats.trend === "improving"
      ? TrendingUp
      : stats.trend === "declining"
        ? TrendingDown
        : Minus;

  const trendCls = trendColor(stats.trend);

  const items = [
    { label: t("average"), value: stats.average, highlight: true },
    { label: t("min"),     value: stats.min,     highlight: false },
    { label: t("max"),     value: stats.max,     highlight: false },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, value, highlight }) => (
        <div
          key={label}
          className="rounded-xl border border-border bg-card p-4"
        >
          <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
          <p className={`text-2xl font-bold tabular-nums mt-1 ${highlight ? "text-foreground" : "text-muted-foreground"}`}>
            {value.toLocaleString()}
            <span className="text-xs font-normal text-muted-foreground ml-1">{stats.unit}</span>
          </p>
        </div>
      ))}

      {/* Trend card */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] text-muted-foreground font-medium">{t("trend")}</p>
        <div className={`flex items-center gap-1 mt-1 ${trendCls}`}>
          <TrendIcon className="h-5 w-5" aria-hidden />
          <span className="text-lg font-bold tabular-nums">
            {stats.change_percent > 0 ? "+" : ""}
            {stats.change_percent}%
          </span>
        </div>
      </div>
    </div>
  );
}
