/**
 * Analytics data helpers — called in Server Components (direct) or Client Components (HTTP).
 * Server Components: import and call the service functions directly.
 * Client Components: use bffFetch() with HTTP call to /api/v1/analytics/*.
 *
 * analytics-data.ts replaces the BFF HTTP route as the primary entry point for Server Components.
 * The BFF routes remain for Client Components (which cannot import server code).
 */
import { headers } from "next/headers";
import type {
  AggregationPoint,
  AggregationResponse,
  ComparisonPoint,
  ComparisonResponse,
  GoalProgressPoint,
  GoalProgressResponse,
  PeriodComparisonResponse,
  MetricType,
  AggregationPeriod,
  ReportPeriod,
} from "@/types/api";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function bffFetch(path: string): Promise<unknown> {
  const reqHeaders = await headers();
  const res = await fetch(`${APP_URL}${path}`, {
    cache: "no-store",
    headers: { cookie: reqHeaders.get("cookie") ?? "" },
  });
  if (!res.ok) {
    console.error(`[analytics-data] bffFetch failed: ${res.status} ${path}`);
    return null;
  }
  return res.json().catch((e) => {
    console.error(`[analytics-data] JSON parse error: ${e}`);
    return null;
  });
}

export async function getAggregatedMetrics(
  metricType: MetricType,
  period: AggregationPeriod = "daily",
  dateFrom?: string,
  dateTo?: string
): Promise<AggregationPoint[]> {
  let url = `/api/v1/analytics/aggregated?metric_type=${metricType}&period=${period}`;
  if (dateFrom) url += `&date_from=${dateFrom}`;
  if (dateTo) url += `&date_to=${dateTo}`;
  const json = await bffFetch(url);
  return (json as AggregationResponse | null)?.data ?? [];
}

export async function getMultiMetricComparison(
  metrics: MetricType[],
  period: ReportPeriod = "30d"
): Promise<ComparisonPoint[]> {
  const json = await bffFetch(`/api/v1/analytics/compare?metrics=${metrics.join(",")}&period=${period}`);
  return (json as ComparisonResponse | null)?.data ?? [];
}

export async function getGoalProgress(
  metric: MetricType,
  target: number,
  period: ReportPeriod = "30d"
): Promise<GoalProgressPoint[]> {
  const json = await bffFetch(
    `/api/v1/analytics/goal-progress?metric=${metric}&target=${target}&period=${period}`
  );
  return (json as GoalProgressResponse | null)?.data ?? [];
}

export async function getPeriodComparison(
  metric: MetricType,
  period: ReportPeriod = "30d"
): Promise<PeriodComparisonResponse["data"] | null> {
  const json = await bffFetch(`/api/v1/analytics/period-comparison?metric=${metric}&period=${period}`);
  return (json as { data?: PeriodComparisonResponse["data"] } | null)?.data ?? null;
}

// Calories come from meals, not health_metrics
export async function getMealCalorieProgress(days: number = 7): Promise<GoalProgressPoint[]> {
  const json = await bffFetch(`/api/v1/analytics/meal-calories?days=${days}&target=2000`);
  return (json as GoalProgressResponse | null)?.data ?? [];
}
