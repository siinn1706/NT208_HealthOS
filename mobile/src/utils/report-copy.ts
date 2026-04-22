import type { ReportPeriod } from "@/api/endpoints/reports";

/** Maps backend trend analysis metric ids to existing health metric label keys. */
const METRIC_LABEL_KEYS: Record<string, string> = {
  heart_rate: "healthMetrics.heartRate",
  steps: "healthMetrics.steps",
  weight_kg: "healthMetrics.weight",
  sleep_minutes: "healthMetrics.sleep",
};

export function reportMetricLabelKey(metric: string | undefined): string {
  const m = (metric ?? "").trim();
  return METRIC_LABEL_KEYS[m] ?? "reports.unknownMetric";
}

export function trendDirectionLabelKey(trend: string | null | undefined): string {
  if (trend === "up") return "reports.trendUp";
  if (trend === "down") return "reports.trendDown";
  return "reports.trendStable";
}

export function reportPeriodLabelKey(period: ReportPeriod | undefined): string {
  if (period === "7d") return "reports.rangeWeek";
  if (period === "90d") return "reports.rangeQuarter";
  return "reports.rangeMonth";
}
