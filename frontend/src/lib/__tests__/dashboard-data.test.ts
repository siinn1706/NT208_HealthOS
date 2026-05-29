import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyDashboardSummaryPayload() {
  return {
    data: {
      user_name: "",
      alerts: [],
      kpis: {
        caloriesBurned: { current: null, target: null },
        sleepScore: { current: null, target: null },
        heartRate: { current: null, target: null },
        steps: { current: null, target: null },
      },
      goals: [],
      ai_insight: null,
    },
  };
}

describe("dashboard data slices", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    headersMock.mockResolvedValue({ get: () => "healthos.session=test" });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("maps non-OK dashboard summary responses to recoverable errors", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: "AUTH_REQUIRED", message: "Authentication required." } }, 401),
    );

    const { getDashboardSummary } = await import("@/lib/dashboard-data");
    const result = await getDashboardSummary();

    expect(result).toEqual({
      status: "recoverable_error",
      error: { code: "AUTH_REQUIRED", message: "Authentication required." },
    });
  });

  it("uses the current request origin for dashboard summary server fetches", async () => {
    headersMock.mockResolvedValue({
      get: (name: string) => {
        const values: Record<string, string> = {
          cookie: "healthos.session=test",
          host: "127.0.0.1:3001",
          "x-forwarded-proto": "http",
        };
        return values[name] ?? null;
      },
    });
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    fetchMock.mockResolvedValue(jsonResponse(emptyDashboardSummaryPayload(), 200));

    const { getDashboardSummary } = await import("@/lib/dashboard-data");
    await getDashboardSummary();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/dashboard/summary",
      expect.objectContaining({
        headers: { cookie: "healthos.session=test" },
      }),
    );
  });

  it("maps invalid dashboard summary responses to parse errors", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null }, 200));

    const { getDashboardSummary } = await import("@/lib/dashboard-data");
    const result = await getDashboardSummary();

    expect(result.status).toBe("recoverable_error");
    expect(result.error?.code).toBe("PARSE_ERROR");
  });

  it("keeps valid empty dashboard summary payloads as successful data", async () => {
    fetchMock.mockResolvedValue(jsonResponse(emptyDashboardSummaryPayload(), 200));

    const { getDashboardSummary } = await import("@/lib/dashboard-data");
    const result = await getDashboardSummary();

    expect(result.status).toBe("success");
    expect(result.data?.alerts).toEqual([]);
    expect(result.data?.goals).toEqual([]);
    expect(result.data?.kpis.steps.current).toBeNull();
  });

  it("rejects malformed dashboard summary containers as parse errors", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }, 200));

    const { getDashboardSummary } = await import("@/lib/dashboard-data");
    const result = await getDashboardSummary();

    expect(result.status).toBe("recoverable_error");
    expect(result.error?.code).toBe("PARSE_ERROR");
  });

  it("maps vitals network exceptions to recoverable errors", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const { getVitalsTimeseries } = await import("@/lib/dashboard-data");
    const result = await getVitalsTimeseries(7);

    expect(result).toEqual({
      status: "recoverable_error",
      error: {
        code: "VITALS_TIMESERIES_FETCH_FAILED",
        message: "Could not load vitals timeseries.",
      },
    });
  });

  it("keeps valid empty vitals payloads as empty data and maps populated values", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [] }, 200))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            data: [
              {
                date: "2026-05-29",
                heart_rate: 72,
                systolic: 118,
                diastolic: 76,
              },
            ],
          },
          200,
        ),
      );

    const { getVitalsTimeseries } = await import("@/lib/dashboard-data");
    await expect(getVitalsTimeseries(7)).resolves.toEqual({ status: "empty", data: [] });
    await expect(getVitalsTimeseries(7)).resolves.toEqual({
      status: "success",
      data: [{ date: "2026-05-29", heartRate: 72, systolic: 118, diastolic: 76 }],
    });
  });

  it("rejects malformed vitals rows as parse errors", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ heart_rate: 72 }] }, 200));

    const { getVitalsTimeseries } = await import("@/lib/dashboard-data");
    const result = await getVitalsTimeseries(7);

    expect(result.status).toBe("recoverable_error");
    expect(result.error?.code).toBe("PARSE_ERROR");
  });
});
