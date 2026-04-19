import { apiFetch, unwrapData } from "../client";

/**
 * Mirrors backend `app/schemas/dashboard.py:DashboardSummaryDTO`.
 *
 * Notes vs. the BFF-shaped types you may have seen elsewhere:
 *  - `kpis` is a **map keyed by metric key** (e.g. `steps`, `heart_rate`), not an array.
 *  - `alerts[*].type` is a tone string (e.g. `info`, `warning`, `danger`); there is no
 *    `level`/`title`/`body` on the wire — only `message` (+ optional code/params).
 *  - `ai_insight.text` carries the human-readable copy; there is no `title`/`body`.
 */
export interface DashboardAlert {
  id: string;
  type: string;
  message: string;
  alert_code?: string | null;
  alert_params?: Record<string, unknown> | null;
}

export interface KpiValue {
  current: number | null;
  target: number | null;
}

export interface DashboardGoal {
  id: string;
  key: string;
  current: number | null;
  target: number | null;
  unit: string;
}

export interface DashboardAiInsight {
  text: string;
  category?: string | null;
  insight_code?: string | null;
  insight_params?: Record<string, unknown> | null;
}

export interface DashboardSummary {
  user_name: string;
  alerts: DashboardAlert[];
  kpis: Record<string, KpiValue>;
  goals: DashboardGoal[];
  ai_insight: DashboardAiInsight | null;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await apiFetch<{ data: DashboardSummary } | DashboardSummary>(
    "/v1/dashboard/summary"
  );
  return unwrapData(res);
}
