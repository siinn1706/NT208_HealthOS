import { apiFetch, unwrapData } from "../client";
import type { MetricPeriod, MetricType } from "./health-metrics";

export interface HealthGoal {
  id: string;
  target_weight_kg?: number | null;
  deadline?: string | null;
  notes?: string | null;
}

export interface HealthGoalCreate {
  target_weight_kg?: number;
  deadline?: string;
  notes?: string;
}

export async function fetchHealthGoal(): Promise<HealthGoal | null> {
  const res = await apiFetch<{ data: HealthGoal | null }>(
    "/v1/health-goals"
  );
  return unwrapData(res);
}

export async function createHealthGoal(payload: HealthGoalCreate): Promise<HealthGoal> {
  const res = await apiFetch<{ data: HealthGoal }>("/v1/health-goals", {
    method: "POST",
    body: payload,
  });
  return unwrapData(res);
}

export async function updateHealthGoal(
  id: string,
  payload: Partial<HealthGoalCreate>
): Promise<HealthGoal> {
  const res = await apiFetch<{ data: HealthGoal }>(`/v1/health-goals/${id}`, {
    method: "PATCH",
    body: payload,
  });
  return unwrapData(res);
}

export async function deleteHealthGoal(id: string): Promise<void> {
  await apiFetch<null>(`/v1/health-goals/${id}`, { method: "DELETE" });
}

export interface GoalProgressPoint {
  date: string;
  value: number;
  target: number;
  progress_percent: number;
}

export async function fetchGoalProgress(opts: {
  metric: MetricType;
  target: number;
  period?: MetricPeriod;
}): Promise<GoalProgressPoint[]> {
  const res = await apiFetch<{ data: GoalProgressPoint[] }>("/v1/goals/progress", {
    query: opts,
  });
  return unwrapData(res);
}
