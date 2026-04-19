import { apiFetch, unwrapData } from "../client";

export type MetricType =
  | "heart_rate"
  | "steps"
  | "sleep_minutes"
  | "weight_kg"
  | "blood_pressure_systolic"
  | "blood_pressure_diastolic";

export type MetricPeriod = "7d" | "30d" | "90d";
export type AggregatePeriod = "daily" | "weekly" | "monthly";

export interface HealthMetric {
  id: string;
  metric_type: MetricType;
  value: number;
  unit: string;
  recorded_at: string;
  source?: string | null;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface HealthMetricCreate {
  metric_type: MetricType;
  value: number;
  unit: string;
  recorded_at: string;
  source?: string;
}

export async function listHealthMetrics(opts: {
  metric_type?: MetricType;
  date_from?: string;
  date_to?: string;
  source?: string;
  range?: MetricPeriod;
  page?: number;
  per_page?: number;
} = {}): Promise<{ data: HealthMetric[]; meta: PaginationMeta }> {
  return apiFetch<{ data: HealthMetric[]; meta: PaginationMeta }>(
    "/v1/health-metrics",
    { query: opts }
  );
}

/**
 * Mirrors backend `app/schemas/health_metrics.py:MetricAggregatePoint`.
 * Backend uses `min_value` / `max_value` (NOT `min` / `max`).
 */
export interface MetricAggregatePoint {
  date: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  count: number;
}

export async function fetchAggregated(opts: {
  metric_type: MetricType;
  period?: AggregatePeriod;
  date_from?: string;
  date_to?: string;
}): Promise<MetricAggregatePoint[]> {
  const res = await apiFetch<{ data: MetricAggregatePoint[] }>(
    "/v1/health-metrics/aggregated",
    { query: opts }
  );
  return unwrapData(res);
}

export interface ComparisonPoint {
  date: string;
  values: Record<string, number>;
}

export async function compareMetrics(opts: {
  metrics: MetricType[];
  period?: MetricPeriod;
}): Promise<ComparisonPoint[]> {
  const res = await apiFetch<{ data: ComparisonPoint[] }>(
    "/v1/health-metrics/compare",
    { query: { metrics: opts.metrics.join(","), period: opts.period } }
  );
  return unwrapData(res);
}

/**
 * Mirrors backend `app/schemas/health_metrics.py:PeriodComparisonData`.
 * Backend uses `avg_value`, `min_value`, `max_value`, `total_value`, `count`,
 * `trend` for each period and `change_percent` (NOT `delta`) for the diff.
 */
export interface PeriodStats {
  period: "current" | "previous";
  avg_value: number | null;
  min_value: number | null;
  max_value: number | null;
  total_value: number;
  count: number;
  trend: "improving" | "declining" | "stable";
}

export interface PeriodComparisonData {
  current: PeriodStats;
  previous: PeriodStats;
  change_percent: number;
}

export async function comparePeriods(opts: {
  metric: MetricType;
  period?: MetricPeriod;
}): Promise<PeriodComparisonData> {
  const res = await apiFetch<{ data: PeriodComparisonData } | PeriodComparisonData>(
    "/v1/health-metrics/compare-periods",
    { query: opts }
  );
  return unwrapData(res);
}

/**
 * Note: POST /v1/health-metrics returns the bare DTO (not wrapped in { data }).
 * Per backend audit in [health_metrics.py](backend/app/api/v1/endpoints/health_metrics.py).
 */
export async function createHealthMetric(payload: HealthMetricCreate): Promise<HealthMetric> {
  const res = await apiFetch<HealthMetric | { data: HealthMetric }>(
    "/v1/health-metrics",
    { method: "POST", body: payload }
  );
  return unwrapData(res);
}

export async function updateHealthMetric(
  id: string,
  payload: Partial<HealthMetricCreate>
): Promise<HealthMetric> {
  const res = await apiFetch<HealthMetric | { data: HealthMetric }>(
    `/v1/health-metrics/${id}`,
    { method: "PATCH", body: payload }
  );
  return unwrapData(res);
}
