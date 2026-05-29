import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { IntlWrapper } from "@/__tests__/test-utils";
import { RealtimeAnomalyWidget } from "@/components/dashboard/widgets/RealtimeAnomalyWidget";
import { TrendSummaryWidget } from "@/components/dashboard/widgets/TrendSummaryWidget";
import { fetchTrendAnalysisBatch } from "@/lib/reports-trends-client";

vi.mock("@/hooks/useHealthAlerts", () => ({
  useHealthAlerts: () => ({
    alerts: [],
    dismissAlert: vi.fn(),
    status: "connected",
  }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function trend(metric: string, value = 72) {
  return {
    metric,
    metric_label: metric.toUpperCase(),
    unit: "bpm",
    period: "7d",
    data_points: [{ date: "2026-05-29", value }],
    trend_line: [value],
    prediction: [],
    anomalies: [],
    trend: "stable",
    change_percent: 0,
    ai_summary: "TREND_SUMMARY",
    ai_summary_params: {},
  };
}

function sessionResponse(userId = "user-1") {
  return jsonResponse({ data: { user_id: userId } });
}

function getBatchCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([path]) =>
    String(path).startsWith("/api/v1/reports/trends/batch"),
  );
}

function getSingleTrendCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([path]) =>
    String(path).startsWith("/api/v1/reports/trends?"),
  );
}

function createDeferredResponse() {
  let resolveResponse: (response: Response) => void = () => {};
  const promise = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });
  return { promise, resolveResponse };
}

describe("dashboard trend batch widgets", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("loads trend summary metrics with one BFF batch request", async () => {
    const fetchMock = vi.fn((path: string) => {
      if (path.startsWith("/api/v1/auth/session")) {
        return Promise.resolve(sessionResponse());
      }
      return Promise.resolve(
        jsonResponse({
          data: {
            heart_rate: trend("heart_rate"),
            steps: trend("steps"),
          },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TrendSummaryWidget />, { wrapper: IntlWrapper });

    await waitFor(() => expect(getBatchCalls(fetchMock)).toHaveLength(1));
    const [path, init] = getBatchCalls(fetchMock)[0] as [string, RequestInit];
    const url = new URL(path, "http://test");
    expect(url.pathname).toBe("/api/v1/reports/trends/batch");
    expect(url.searchParams.get("metrics")).toBe("calories,heart_rate,sleep,steps,weight");
    expect(url.searchParams.get("period")).toBe("7d");
    expect(init.credentials).toBe("include");
    expect(getSingleTrendCalls(fetchMock)).toHaveLength(0);
  });

  it("loads anomaly history with one BFF batch request", async () => {
    const fetchMock = vi.fn((path: string) => {
      if (path.startsWith("/api/v1/auth/session")) {
        return Promise.resolve(sessionResponse());
      }
      return Promise.resolve(
        jsonResponse({
          data: {
            heart_rate: {
              ...trend("heart_rate"),
              anomalies: [
                {
                  date: "2026-05-29",
                  value: 120,
                  deviation_percent: 30,
                  severity: "warning",
                },
              ],
            },
          },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<RealtimeAnomalyWidget />, { wrapper: IntlWrapper });

    await waitFor(() => expect(getBatchCalls(fetchMock)).toHaveLength(1));
    const [path, init] = getBatchCalls(fetchMock)[0] as [string, RequestInit];
    const url = new URL(path, "http://test");
    expect(url.pathname).toBe("/api/v1/reports/trends/batch");
    expect(url.searchParams.get("metrics")).toBe(
      "blood_pressure,heart_rate,sleep,steps,weight",
    );
    expect(url.searchParams.get("period")).toBe("30d");
    expect(init.credentials).toBe("include");
    expect(getSingleTrendCalls(fetchMock)).toHaveLength(0);
  });

  it("returns empty trend data for non-OK batch responses", async () => {
    const fetchMock = vi.fn((path: string) => {
      if (path.startsWith("/api/v1/auth/session")) {
        return Promise.resolve(sessionResponse());
      }
      return Promise.resolve(jsonResponse({ error: "nope" }, 500));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTrendAnalysisBatch(["heart_rate"], "7d")).resolves.toEqual({});
  });

  it("dedupes identical in-flight batch requests by normalized metric set and period", async () => {
    const deferred = createDeferredResponse();
    const fetchMock = vi.fn((path: string) => {
      if (path.startsWith("/api/v1/auth/session")) {
        return Promise.resolve(sessionResponse());
      }
      return deferred.promise;
    });
    vi.stubGlobal("fetch", fetchMock);

    const firstRequest = fetchTrendAnalysisBatch(["steps", "heart_rate"], "7d");
    const secondRequest = fetchTrendAnalysisBatch(["heart_rate", "steps"], "7d");

    await waitFor(() => expect(getBatchCalls(fetchMock)).toHaveLength(1));

    deferred.resolveResponse(jsonResponse({ data: { steps: trend("steps") } }));
    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      { steps: trend("steps") },
      { steps: trend("steps") },
    ]);
  });

  it("does not share in-flight trend data across different authenticated users", async () => {
    const firstBatch = createDeferredResponse();
    const secondBatch = createDeferredResponse();
    let sessionCount = 0;
    const batchResponses = [firstBatch.promise, secondBatch.promise];
    const fetchMock = vi.fn((path: string) => {
      if (path.startsWith("/api/v1/auth/session")) {
        sessionCount += 1;
        return Promise.resolve(sessionResponse(sessionCount === 1 ? "user-a" : "user-b"));
      }
      return batchResponses.shift() ?? Promise.reject(new Error("unexpected batch call"));
    });
    vi.stubGlobal("fetch", fetchMock);

    const userARequest = fetchTrendAnalysisBatch(["steps"], "7d");
    await waitFor(() => expect(getBatchCalls(fetchMock)).toHaveLength(1));

    const userBRequest = fetchTrendAnalysisBatch(["steps"], "7d");
    await waitFor(() => expect(getBatchCalls(fetchMock)).toHaveLength(2));

    firstBatch.resolveResponse(jsonResponse({ data: { steps: trend("steps", 70) } }));
    secondBatch.resolveResponse(jsonResponse({ data: { steps: trend("steps", 88) } }));

    await expect(Promise.all([userARequest, userBRequest])).resolves.toEqual([
      { steps: trend("steps", 70) },
      { steps: trend("steps", 88) },
    ]);
  });

  it("keeps the latest period data when an older period response resolves last", async () => {
    const firstBatch = createDeferredResponse();
    const secondBatch = createDeferredResponse();
    const batchResponses = [firstBatch.promise, secondBatch.promise];
    const fetchMock = vi.fn((path: string) => {
      if (path.startsWith("/api/v1/auth/session")) {
        return Promise.resolve(sessionResponse());
      }
      return batchResponses.shift() ?? Promise.reject(new Error("unexpected batch call"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TrendSummaryWidget />, { wrapper: IntlWrapper });
    await waitFor(() => expect(getBatchCalls(fetchMock)).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: "30 ngày" }));
    await waitFor(() => expect(getBatchCalls(fetchMock)).toHaveLength(2));

    secondBatch.resolveResponse(jsonResponse({ data: { heart_rate: trend("heart_rate", 88) } }));
    firstBatch.resolveResponse(jsonResponse({ data: { heart_rate: trend("heart_rate", 72) } }));

    await waitFor(() => expect(screen.getByText("88")).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("72")).not.toBeInTheDocument());
  });
});
