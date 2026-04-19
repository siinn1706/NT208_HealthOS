import { apiFetch, unwrapData } from "../client";

export interface RiskItem {
  id?: string;
  name: string;
  severity?: "low" | "moderate" | "high";
  score?: number;
  recommendation?: string;
}

export interface RiskSummary {
  generatedAt?: string;
  overallScore?: number;
  risks?: RiskItem[];
  disclaimer?: string;
}

export async function fetchRiskSummary(): Promise<RiskSummary> {
  const res = await apiFetch<{ data: RiskSummary } | RiskSummary>(
    "/v1/health/risk-predictions"
  );
  return unwrapData(res);
}
