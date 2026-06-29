import { headers } from "next/headers";
import type {
  HealthReport,
  HealthStatus,
  ReportPeriod,
  ReportSection,
  ReportCategory,
  ReportAlert,
  SectionStats,
  TimeseriesPoint,
  TrendDirection,
  TrendAnalysis,
  TrendAnalysisBatch,
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

// ─── Normalization helpers ──────────────────────────────────────────────────

const VALID_CATEGORIES = new Set<string>(["vitals", "nutrition", "activity", "sleep", "bmi", "medication"]);
const VALID_TRENDS = new Set<string>(["improving", "stable", "declining"]);
const VALID_STATUSES = new Set<string>(["normal", "warning", "critical"]);

function normalizeTimeseriesPoint(pt: unknown): TimeseriesPoint {
  const p = (pt && typeof pt === "object" ? pt : {}) as Record<string, unknown>;
  return {
    date: typeof p.date === "string" ? p.date : "",
    value: typeof p.value === "number" ? p.value : 0,
    ...(typeof p.value2 === "number" ? { value2: p.value2 } : {}),
    ...(typeof p.value3 === "number" ? { value3: p.value3 } : {}),
    ...(typeof p.label === "string" ? { label: p.label } : {}),
  };
}

function normalizeStats(s: unknown): SectionStats {
  const st = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
  return {
    average: typeof st.average === "number" ? st.average : 0,
    min: typeof st.min === "number" ? st.min : 0,
    max: typeof st.max === "number" ? st.max : 0,
    trend: VALID_TRENDS.has(st.trend as string) ? (st.trend as TrendDirection) : "stable",
    change_percent: typeof st.change_percent === "number" ? st.change_percent : 0,
    unit: typeof st.unit === "string" ? st.unit : "",
  };
}

function normalizeAlert(a: unknown): ReportAlert {
  const al = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
  return {
    id: typeof al.id === "string" ? al.id : `alert-${Math.random().toString(36).slice(2)}`,
    severity: al.severity === "critical" ? "critical" : "warning",
    metric: typeof al.metric === "string" ? al.metric : "",
    message: typeof al.message === "string" ? al.message : "",
    value: typeof al.value === "number" ? al.value : 0,
    threshold: typeof al.threshold === "number" ? al.threshold : 0,
    unit: typeof al.unit === "string" ? al.unit : "",
    timestamp: typeof al.timestamp === "string" ? al.timestamp : "",
  };
}

function normalizeSection(sec: unknown): ReportSection {
  const s = (sec && typeof sec === "object" ? sec : {}) as Record<string, unknown>;
  return {
    category: VALID_CATEGORIES.has(s.category as string)
      ? (s.category as ReportCategory)
      : "vitals",
    title: typeof s.title === "string" ? s.title : "",
    summary: typeof s.summary === "string" ? s.summary : "",
    status: VALID_STATUSES.has(s.status as string) ? (s.status as HealthStatus) : "normal",
    data: Array.isArray(s.data) ? s.data.map(normalizeTimeseriesPoint) : [],
    stats: normalizeStats(s.stats),
    alerts: Array.isArray(s.alerts) ? s.alerts.map(normalizeAlert) : [],
  };
}

function normalizeReport(raw: unknown, period: ReportPeriod): HealthReport {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!r.id && !r.generated_at) return emptyReport(period);
  return {
    id: typeof r.id === "string" ? r.id : `report-${period}`,
    user_id: typeof r.user_id === "string" ? r.user_id : "",
    period,
    generated_at: typeof r.generated_at === "string" ? r.generated_at : "",
    status: VALID_STATUSES.has(r.status as string) ? (r.status as HealthStatus) : "normal",
    sections: Array.isArray(r.sections) ? r.sections.map(normalizeSection) : [],
    alerts: Array.isArray(r.alerts) ? r.alerts.map(normalizeAlert) : [],
    ai_summary: typeof r.ai_summary === "string" ? r.ai_summary : null,
  };
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

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
    const data = (json as { data?: unknown } | null)?.data;
    if (!data) return emptyReport(period);
    return normalizeReport(data, period);
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

export async function getTrendAnalysisBatch(
  metrics: string[],
  period: ReportPeriod = "30d"
): Promise<TrendAnalysisBatch> {
  const requested = Array.from(
    new Set(metrics.flatMap((metric) => {
      const normalized = metric.trim().toLowerCase();
      return normalized ? [normalized] : [];
    }))
  );
  if (requested.length === 0) return {};

  try {
    const params = new URLSearchParams({
      metrics: requested.join(","),
      period,
    });
    const json = await fetchJson(`/api/v1/reports/trends/batch?${params.toString()}`);
    const data = (json as { data?: TrendAnalysisBatch } | null)?.data;
    if (!data || typeof data !== "object") return {};
    return data;
  } catch {
    return {};
  }
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

