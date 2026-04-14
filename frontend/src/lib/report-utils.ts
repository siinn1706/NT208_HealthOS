/**
 * Shared utilities and constants for the reports feature.
 * Usable in both Server and Client Components.
 */
import {
  HeartPulse,
  UtensilsCrossed,
  Footprints,
  Moon,
  Scale,
  Pill,
  type LucideIcon,
} from "lucide-react";
import type { HealthStatus, ReportCategory, TrendDirection } from "@/types/api";
import { getLocaleTag } from "@/lib/format-utils";

// ─── Status helpers ──────────────────────────────────────────────────────────

export function statusColor(status: HealthStatus): string {
  switch (status) {
    case "critical": return "text-destructive";
    case "warning":  return "text-amber-500";
    default:         return "text-emerald-500";
  }
}

export function statusBadgeVariant(status: HealthStatus): "destructive" | "outline" | "secondary" {
  switch (status) {
    case "critical": return "destructive";
    case "warning":  return "outline";
    default:         return "secondary";
  }
}

export function statusBgColor(status: HealthStatus): string {
  switch (status) {
    case "critical": return "bg-destructive/10 border-destructive/20";
    case "warning":  return "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40";
    default:         return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40";
  }
}

// ─── Trend helpers ───────────────────────────────────────────────────────────

export function trendArrow(trend: TrendDirection, higherIsBetter = true): string {
  if (trend === "stable") return "→";
  const up = trend === "improving" ? higherIsBetter : !higherIsBetter;
  return up ? "↑" : "↓";
}

export function trendColor(trend: TrendDirection): string {
  if (trend === "stable") return "text-muted-foreground";
  const positive = trend === "improving";
  return positive ? "text-emerald-500" : "text-amber-500";
}

// ─── Category metadata ───────────────────────────────────────────────────────

export interface CategoryMeta {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  iconColor: string;
  higherIsBetter: boolean;
}

const CATEGORY_META: Record<ReportCategory, CategoryMeta> = {
  vitals:     { icon: HeartPulse,      color: "#E8BDB7", bgColor: "#FDF0EF", iconColor: "#C25D57", higherIsBetter: false },
  nutrition:  { icon: UtensilsCrossed, color: "#41BCE6", bgColor: "#EBF8FD", iconColor: "#1A8BB5", higherIsBetter: true },
  activity:   { icon: Footprints,      color: "#6DE7F7", bgColor: "#EEFCFE", iconColor: "#1AAFC5", higherIsBetter: true },
  sleep:      { icon: Moon,            color: "#E7DEA7", bgColor: "#FDFBEC", iconColor: "#A08020", higherIsBetter: true },
  bmi:        { icon: Scale,           color: "#E3B79A", bgColor: "#FDF4EE", iconColor: "#B5622A", higherIsBetter: false },
  medication: { icon: Pill,            color: "#A8D8A8", bgColor: "#EDFAED", iconColor: "#2E8B2E", higherIsBetter: true },
};

export function getCategoryMeta(category: ReportCategory): CategoryMeta {
  return CATEGORY_META[category];
}

// ─── Date formatting ────────────────────────────────────────────────────────

export function formatReportDate(isoDate: string, locale = "vi"): string {
  try {
    const localeTag = getLocaleTag(locale);
    return new Intl.DateTimeFormat(localeTag, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

export function formatPeriodLabel(period: string, labels?: Record<string, string>): string {
  if (labels) return labels[period] ?? period;
  const fallback: Record<string, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };
  return fallback[period] ?? period;
}
