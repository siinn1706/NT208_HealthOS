import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

import { IntlWrapper } from "@/__tests__/test-utils";
import { RealtimeAnomalyWidget } from "@/components/dashboard/widgets/RealtimeAnomalyWidget";
import { TrendSummaryWidget } from "@/components/dashboard/widgets/TrendSummaryWidget";

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

function trend(metric: string) {
  return {
    metric,
    metric_label: metric.toUpperCase(),
    unit: "bpm",
    period: "7d",
    data_points: [{ date: "2026-05-29", value: 72 }],
    trend_line: [72],
    prediction: [],
    anomalies: [],
    trend: "stable",
    change_percent: 0,
    ai_summary: "TREND_SUMMARY",
    ai_summary_params: {},
  };
}

describe("dashboard trend batch widgets", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("loads trend summary metrics with one BFF batch request", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        data: {
          heart_rate: trend("heart_rate"),
          steps: trend("steps"),
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<TrendSummaryWidget />, { wrapper: IntlWrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(path, "http://test");
    expect(url.pathname).toBe("/api/v1/reports/trends/batch");
    expect(url.searchParams.get("metrics")).toBe("heart_rate,steps,sleep,calories,weight");
    expect(url.searchParams.get("period")).toBe("7d");
    expect(init.credentials).toBe("include");
  });

  it("loads anomaly history with one BFF batch request", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
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
    vi.stubGlobal("fetch", fetchMock);

    render(<RealtimeAnomalyWidget />, { wrapper: IntlWrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(path, "http://test");
    expect(url.pathname).toBe("/api/v1/reports/trends/batch");
    expect(url.searchParams.get("metrics")).toBe(
      "heart_rate,blood_pressure,steps,sleep,weight",
    );
    expect(url.searchParams.get("period")).toBe("30d");
    expect(init.credentials).toBe("include");
  });
});
