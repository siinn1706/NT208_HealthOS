import { apiFetch, unwrapData } from "../client";

export type ReportPeriod = "7d" | "30d" | "90d";

export interface HealthReport {
  generated_at?: string;
  period?: ReportPeriod;
  sections?: Array<{
    title?: string;
    body?: string;
    metric?: string;
    [key: string]: unknown;
  }>;
  summary?: string;
  [key: string]: unknown;
}

export interface TrendAnalysis {
  metric?: string;
  period?: ReportPeriod;
  trend?: "up" | "down" | "stable";
  delta?: number;
  series?: Array<{ date: string; value: number }>;
  [key: string]: unknown;
}

export async function fetchReport(period: ReportPeriod = "7d"): Promise<HealthReport> {
  const res = await apiFetch<{ data: HealthReport } | HealthReport>("/v1/reports", {
    query: { period },
  });
  return unwrapData(res);
}

export async function fetchTrend(opts: {
  metric?: string;
  period?: ReportPeriod;
} = {}): Promise<TrendAnalysis> {
  const res = await apiFetch<{ data: TrendAnalysis } | TrendAnalysis>(
    "/v1/reports/trends",
    { query: opts }
  );
  return unwrapData(res);
}

/**
 * Async PDF export pipeline (B7 P10) per
 * [reports.py](backend/app/api/v1/endpoints/reports.py).
 *
 * Flow:
 *   1. POST /v1/reports/export-pdf       → 202 + request_id
 *   2. GET  /v1/reports/export-pdf/:id   → poll status until "completed" / "failed"
 *   3. GET  /v1/reports/export-pdf/:id/download → mint a 5-min signed URL
 *
 * The mobile client opens the signed URL via `expo-linking` (system browser /
 * Files app) instead of streaming bytes itself; the URL is short-lived and
 * the file is downloaded by the OS.
 */
export type ReportPdfStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | string;

export type ReportPdfSection =
  | "summary"
  | "vitals"
  | "metrics"
  | "meals"
  | "goals"
  | "appointments"
  | "reminders";

export interface ReportPdfRequest {
  id: string;
  user_id?: string;
  status: ReportPdfStatus;
  period?: ReportPeriod;
  sections?: ReportPdfSection[];
  locale?: string;
  include_sensitive?: boolean;
  bytes?: number | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
  failure_reason?: string | null;
}

export interface ReportPdfRequestBody {
  period: ReportPeriod;
  sections: ReportPdfSection[];
  locale?: string;
  include_sensitive?: boolean;
}

export interface ReportPdfSignedUrl {
  url: string;
  expires_in_s: number;
  bytes: number;
  expires_at: string;
}

export async function requestReportPdf(
  body: ReportPdfRequestBody
): Promise<ReportPdfRequest> {
  const res = await apiFetch<{ data: ReportPdfRequest }>(
    "/v1/reports/export-pdf",
    { method: "POST", body }
  );
  return unwrapData(res);
}

export async function getReportPdfStatus(
  requestId: string
): Promise<ReportPdfRequest> {
  const res = await apiFetch<{ data: ReportPdfRequest }>(
    `/v1/reports/export-pdf/${requestId}`
  );
  return unwrapData(res);
}

export async function getReportPdfDownload(
  requestId: string
): Promise<ReportPdfSignedUrl> {
  const res = await apiFetch<{ data: ReportPdfSignedUrl }>(
    `/v1/reports/export-pdf/${requestId}/download`
  );
  return unwrapData(res);
}
