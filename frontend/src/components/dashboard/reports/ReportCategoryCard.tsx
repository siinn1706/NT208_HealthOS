import {
  HeartPulse,
  UtensilsCrossed,
  Footprints,
  Moon,
  Scale,
  Pill,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ReportSection } from "@/types/api";
import { statusColor, statusBadgeVariant, trendColor } from "@/lib/report-utils";
import { getLocaleTag } from "@/lib/format-utils";

// ─── Icon map ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS = {
  vitals:     HeartPulse,
  nutrition:  UtensilsCrossed,
  activity:   Footprints,
  sleep:      Moon,
  bmi:        Scale,
  medication: Pill,
} as const;

const CATEGORY_COLORS: Record<string, string> = {
  vitals:     "#E8BDB7",
  nutrition:  "#41BCE6",
  activity:   "#6DE7F7",
  sleep:      "#E7DEA7",
  bmi:        "#E3B79A",
  medication: "#A8D8A8",
};

interface ReportCategoryCardProps {
  section: ReportSection;
  locale: string;
  period: string;
}

export async function ReportCategoryCard({
  section,
  locale,
  period,
}: ReportCategoryCardProps) {
  const t = await getTranslations("reports");

  const Icon = CATEGORY_ICONS[section.category] ?? HeartPulse;
  const iconColor = CATEGORY_COLORS[section.category] ?? "#41BCE6";

  const TrendIcon =
    section.stats.trend === "improving"
      ? TrendingUp
      : section.stats.trend === "declining"
        ? TrendingDown
        : Minus;

  const trendCls = trendColor(section.stats.trend);

  return (
    <Link
      href={`/${locale}/dashboard/reports/${section.category}?period=${period}`}
      className="group rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200 cursor-pointer"
      aria-label={`Xem chi tiết ${section.title}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: `${iconColor}20` }}
          >
            <Icon className="h-4 w-4" style={{ color: iconColor }} aria-hidden />
          </div>
          <span className="text-sm font-semibold text-foreground">
            {t(`categories.${section.category}` as Parameters<typeof t>[0])}
          </span>
        </div>
        <Badge
          variant={statusBadgeVariant(section.status)}
          className="text-[10px] px-1.5 py-0 shrink-0"
        >
          {t(`status${section.status.charAt(0).toUpperCase() + section.status.slice(1)}` as Parameters<typeof t>[0])}
        </Badge>
      </div>

      {/* Main stat */}
      <div>
        <p className={`text-2xl font-bold tabular-nums ${statusColor(section.status)}`}>
          {section.stats.average.toLocaleString(getLocaleTag(locale))}
          <span className="text-xs font-normal text-muted-foreground ml-1">
            {section.stats.unit}
          </span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {t("stats.average")}
        </p>
      </div>

      {/* Trend row */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1 text-xs font-medium ${trendCls}`}>
          <TrendIcon className="h-3.5 w-3.5" aria-hidden />
          <span>
            {section.stats.change_percent > 0 ? "+" : ""}
            {section.stats.change_percent}%
          </span>
          <span className="text-muted-foreground font-normal">
            {t(`trend.${section.stats.trend}` as Parameters<typeof t>[0])}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden />
      </div>

      {/* Summary line */}
      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
        {section.summary}
      </p>

      {/* Alert badge */}
      {section.alerts.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
          {section.alerts.length} cảnh báo
        </div>
      )}
    </Link>
  );
}
