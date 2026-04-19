import { apiFetch, unwrapData } from "../client";

export interface VitalPoint {
  date: string;
  heart_rate?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
}

export async function fetchVitalsTimeseries(days = 7): Promise<VitalPoint[]> {
  const safe = Math.min(90, Math.max(1, days));
  const res = await apiFetch<{ data: VitalPoint[] }>("/v1/vitals/timeseries", {
    query: { days: safe },
  });
  return unwrapData(res);
}
