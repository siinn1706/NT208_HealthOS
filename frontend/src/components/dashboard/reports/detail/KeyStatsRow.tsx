import { getTranslations, getLocale } from "next-intl/server";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SectionStats } from "@/types/api";
import { trendColor } from "@/lib/report-utils";
import { getLocaleTag } from "@/lib/format-utils";

interface KeyStatsRowProps {
  stats: SectionStats;
  /**
   * Whether higher numeric values are clinically *better* for this metric.
   * Defaults to true (steps, sleep score, …). For metrics where lower is
   * better (resting HR, BMI, blood pressure) pass `false` so the arrow icon
   * matches the change direction instead of the success/decline label.
   */
  higherIsBetter?: boolean;
}

export async function KeyStatsRow({ stats, higherIsBetter = true }: KeyStatsRowProps) {
  const t = await getTranslations("reports.stats");
  const locale = await getLocale();

  // Resolve the actual numeric direction so the icon matches the data, not
  // just the backend's "improving / declining" label. e.g. for BMI an
  // *improving* trend often means the value went down — TrendingDown is the
  // honest icon there.
  const numericDirection: "up" | "down" | "flat" =
    typeof stats.change_percent === "number" && Number.isFinite(stats.change_percent)
      ? stats.change_percent > 0
        ? "up"
        : stats.change_percent < 0
          ? "down"
          : "flat"
      : stats.trend === "improving"
        ? higherIsBetter ? "up" : "down"
        : stats.trend === "declining"
          ? higherIsBetter ? "down" : "up"
          : "flat";

  const TrendIcon =
    numericDirection === "up" ? TrendingUp : numericDirection === "down" ? TrendingDown : Minus;

  const trendCls = trendColor(stats.trend);

  const items = [
    { label: t("average"), value: stats.average, highlight: true },
    { label: t("min"),     value: stats.min,     highlight: false },
    { label: t("max"),     value: stats.max,     highlight: false },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, value, highlight }) => {
        const hasValue = typeof value === "number" && Number.isFinite(value);
        return (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${highlight ? "text-foreground" : "text-muted-foreground"}`}>
              {hasValue ? (value as number).toLocaleString(getLocaleTag(locale)) : "--"}
              {hasValue && (
                <span className="text-xs font-normal text-muted-foreground ml-1">{stats.unit}</span>
              )}
            </p>
          </div>
        );
      })}

      {/* Trend card — only render when we actually have a delta to report. */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] text-muted-foreground font-medium">{t("trend")}</p>
        {typeof stats.change_percent === "number" && Number.isFinite(stats.change_percent) ? (
          <div className={`flex items-center gap-1 mt-1 ${trendCls}`}>
            <TrendIcon className="h-5 w-5" aria-hidden />
            <span className="text-lg font-bold tabular-nums">
              {stats.change_percent > 0 ? "+" : ""}
              {stats.change_percent}%
            </span>
          </div>
        ) : (
          <p className="text-lg font-bold tabular-nums mt-1 text-muted-foreground">--</p>
        )}
      </div>
    </div>
  );
}
