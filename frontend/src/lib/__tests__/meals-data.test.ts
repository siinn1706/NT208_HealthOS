import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestHeaders(values: Record<string, string>) {
  return {
    get: (name: string) => values[name] ?? null,
  };
}

describe("meals server data", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.APP_ENV;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.APP_ENV;
  });

  it("uses the active request origin for today's meals in dev", async () => {
    headersMock.mockResolvedValue(
      requestHeaders({
        cookie: "healthos.session=test",
        host: "127.0.0.1:3001",
        "x-forwarded-proto": "http",
      }),
    );
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    const { getMealsToday } = await import("@/lib/meals-data");
    await getMealsToday();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/127\.0\.0\.1:3001\/api\/v1\/meals\?/),
      expect.objectContaining({
        cache: "no-store",
        headers: { cookie: "healthos.session=test" },
      }),
    );
  });

  it("uses the active request origin for weekly chart meal fetches in dev", async () => {
    headersMock.mockResolvedValue(
      requestHeaders({
        cookie: "healthos.session=test",
        "x-forwarded-host": "healthos-dev.test:3002",
        "x-forwarded-proto": "https",
      }),
    );
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    const { getWeeklyCalorieChart } = await import("@/lib/meals-data");
    await getWeeklyCalorieChart();

    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(url).toContain("https://healthos-dev.test:3002/api/v1/meals?");
    expect(url).toContain("per_page=100");
  });

  it("paginates server meal fetches without exceeding Core page limits", async () => {
    headersMock.mockResolvedValue(
      requestHeaders({
        cookie: "healthos.session=test",
        host: "127.0.0.1:3001",
        "x-forwarded-proto": "http",
      }),
    );
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          data: Array.from({ length: 100 }, (_, i) => ({
            id: `meal-${i}`,
            name: `Meal ${i}`,
            status: "analyzed",
            logged_at: "2026-05-30T08:00:00.000Z",
          })),
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: [] }));

    const { getMealsToday } = await import("@/lib/meals-data");
    await getMealsToday();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstUrl = String(fetchMock.mock.calls[0]?.[0] ?? "");
    const secondUrl = String(fetchMock.mock.calls[1]?.[0] ?? "");
    expect(firstUrl).toContain("page=1");
    expect(firstUrl).toContain("per_page=100");
    expect(secondUrl).toContain("page=2");
    expect(secondUrl).toContain("per_page=100");
  });

  it("keeps protected environments pinned to the configured app URL", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "staging";
    headersMock.mockResolvedValue(
      requestHeaders({
        cookie: "healthos.session=test",
        host: "untrusted.example",
        "x-forwarded-proto": "https",
      }),
    );
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    const { getMealsToday } = await import("@/lib/meals-data");
    await getMealsToday();

    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(url).toContain("http://localhost:3000/api/v1/meals?");
  });
});
