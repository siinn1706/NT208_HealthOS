import type { ReportPeriod, TrendAnalysisBatch } from "@/types/api";

type TrendBatchResponse = {
  data?: unknown;
};

const inFlightTrendBatchRequests = new Map<string, Promise<TrendAnalysisBatch>>();

function normalizeTrendMetrics(metrics: readonly string[]): string[] {
  return Array.from(
    new Set(metrics.map((metric) => metric.trim().toLowerCase()).filter(Boolean)),
  ).sort();
}

function isTrendAnalysisBatch(value: unknown): value is TrendAnalysisBatch {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function uniqueUnknownScope(): string {
  return `unknown:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

async function resolveTrendRequestScope(): Promise<string> {
  if (typeof window === "undefined") return "server";

  try {
    const res = await fetch("/api/v1/auth/session", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (res.status === 401 || res.status === 403) return "anon";
    if (!res.ok) return uniqueUnknownScope();

    const json = (await res.json().catch(() => null)) as
      | { data?: { user_id?: unknown; id?: unknown } }
      | null;
    const userId = json?.data?.user_id ?? json?.data?.id;
    return typeof userId === "string" ? `user:${userId}` : uniqueUnknownScope();
  } catch {
    return uniqueUnknownScope();
  }
}

export async function fetchTrendAnalysisBatch(
  metrics: readonly string[],
  period: ReportPeriod,
): Promise<TrendAnalysisBatch> {
  const normalizedMetrics = normalizeTrendMetrics(metrics);
  if (normalizedMetrics.length === 0) {
    return {};
  }

  const requestScope = await resolveTrendRequestScope();
  const requestKey = `${requestScope}:${period}:${normalizedMetrics.join(",")}`;
  const activeRequest = inFlightTrendBatchRequests.get(requestKey);
  if (activeRequest) {
    return activeRequest;
  }

  const params = new URLSearchParams({
    metrics: normalizedMetrics.join(","),
    period,
  });

  const request = fetch(`/api/v1/reports/trends/batch?${params.toString()}`, {
    credentials: "include",
  })
    .then(async (res) => {
      if (!res.ok) return {};

      const json = (await res.json().catch(() => null)) as TrendBatchResponse | null;
      return isTrendAnalysisBatch(json?.data) ? json.data : {};
    })
    .catch(() => ({}))
    .finally(() => {
      inFlightTrendBatchRequests.delete(requestKey);
    });

  inFlightTrendBatchRequests.set(requestKey, request);
  return request;
}
