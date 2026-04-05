import { headers } from "next/headers";
import type {
  HealthReport,
  ReportPeriod,
  ReportSection,
  TrendAnalysis,
  ShareRequest,
  ShareResult,
} from "@/types/api";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function emptyReport(period: ReportPeriod): HealthReport {
  return {
    id: `report-${period}-empty`,
    period,
    generated_at: "",
    user_id: "",
    status: "normal",
    sections: [],
    alerts: [],
  };
}

function emptyTrend(metric: string, period: ReportPeriod): TrendAnalysis {
  return {
    metric,
    metric_label: metric,
    unit: "--",
    period,
    data_points: [],
    trend_line: [],
    prediction: [],
    anomalies: [],
    trend: "stable",
    change_percent: 0,
    ai_summary: "",
  };
}

async function fetchJson(path: string): Promise<unknown> {
  const reqHeaders = await headers();
  const res = await fetch(`${APP_URL}${path}`, {
    cache: "no-store",
    headers: { cookie: reqHeaders.get("cookie") ?? "" },
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export async function getHealthReport(period: ReportPeriod = "7d"): Promise<HealthReport> {
  try {
    const json = await fetchJson(`/api/v1/reports?period=${period}`);
    const data = (json as { data?: HealthReport } | null)?.data;
    if (!data) return emptyReport(period);
    return data;
  } catch {
    return emptyReport(period);
  }
}

export async function getReportSection(
  period: ReportPeriod,
  category: string
): Promise<ReportSection | null> {
  const report = await getHealthReport(period);
  return report.sections.find((section) => section.category === category) ?? null;
}

export async function getTrendAnalysis(
  metric: string,
  period: ReportPeriod = "30d"
): Promise<TrendAnalysis> {
  try {
    const json = await fetchJson(`/api/v1/reports/trends?metric=${metric}&period=${period}`);
    const data = (json as { data?: TrendAnalysis } | null)?.data;
    if (!data) return emptyTrend(metric, period);
    return data;
  } catch {
    return emptyTrend(metric, period);
  }
}

export async function shareReport(request: ShareRequest): Promise<ShareResult[]> {
  return request.recipients.flatMap((recipient) =>
    request.channels.map((channel) => ({
      recipient,
      channel,
      status: "failed" as const,
      error_message: "",
    }))
  );
}

export async function listRecentReports(): Promise<
  Array<{
    id: string;
    period: ReportPeriod;
    generated_at: string;
    status: "normal" | "warning" | "critical";
    alert_count: number;
  }>
> {
  const periods: ReportPeriod[] = ["7d", "30d", "90d"];
  const reports = await Promise.all(periods.map((period) => getHealthReport(period)));

  return reports
    .filter((report) => report.generated_at)
    .map((report) => ({
      id: report.id,
      period: report.period,
      generated_at: report.generated_at,
      status: report.status,
      alert_count: Array.isArray(report.alerts) ? report.alerts.length : 0,
    }))
    .sort(
      (a, b) =>
        new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
    );
}

