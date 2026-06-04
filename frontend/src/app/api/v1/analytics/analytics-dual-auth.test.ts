import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

const getBffAuthContextMock = vi.hoisted(() => vi.fn());
const cacheGetMock = vi.hoisted(() => vi.fn());
const cacheSetMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());
const originalFetch = global.fetch;

vi.mock("@/lib/bff-auth-context", () => ({
  getBffAuthContext: getBffAuthContextMock,
}));

vi.mock("@/lib/redis-cache", () => ({
  cacheGet: cacheGetMock,
  cacheSet: cacheSetMock,
  cacheKey: (principal: string, name: string) => `${principal}:${name}`,
}));

global.fetch = fetchMock as any;

describe("GET /api/v1/analytics/gamification-summary — dual auth + cache", () => {
  beforeEach(() => {
    vi.resetModules();
    getBffAuthContextMock.mockReset();
    cacheGetMock.mockReset();
    cacheSetMock.mockReset();
    fetchMock.mockReset();
    process.env.CORE_API_URL = "http://core.test";
    process.env.NODE_ENV = "development";
  });

  it("makes fetch request with bearer token", async () => {
    const token = "gamification-bearer-1";
    getBffAuthContextMock.mockResolvedValue({
      token,
      kind: "bearer",
      principal: `tk:${token.slice(0, 8)}`,
    });
    cacheGetMock.mockResolvedValue(null);

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ points: 100 }), { status: 200 }),
    );

    const req = new NextRequest("http://localhost/api/v1/analytics/gamification-summary", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const { GET } = await import("@/app/api/v1/analytics/gamification-summary/route");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(getBffAuthContextMock).toHaveBeenCalledWith(req);
    expect(fetchMock).toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe(`Bearer ${token}`);
  });

  it("caches results only for user: principal (not tk: fallback)", async () => {
    const userPrincipal = "user:user-123-uuid";
    getBffAuthContextMock.mockResolvedValue({
      token: "some-jwt",
      kind: "bearer",
      principal: userPrincipal,
    });
    cacheGetMock.mockResolvedValue(null);

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ points: 50, level: 2 }), { status: 200 }),
    );

    const req = new NextRequest("http://localhost/api/v1/analytics/gamification-summary");
    const { GET } = await import("@/app/api/v1/analytics/gamification-summary/route");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(cacheGetMock).toHaveBeenCalledWith(
      expect.stringContaining(userPrincipal),
    );
    expect(cacheSetMock).toHaveBeenCalled();
  });

  it("skips cache for tk: (opaque token) principal", async () => {
    const opaquePrincipal = "tk:abc12345";
    getBffAuthContextMock.mockResolvedValue({
      token: "opaque-token",
      kind: "bearer",
      principal: opaquePrincipal,
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ points: 75 }), { status: 200 }),
    );

    const req = new NextRequest("http://localhost/api/v1/analytics/gamification-summary");
    const { GET } = await import("@/app/api/v1/analytics/gamification-summary/route");
    await GET(req);

    expect(cacheGetMock).not.toHaveBeenCalled();
    expect(cacheSetMock).not.toHaveBeenCalled();
  });

  it("returns cached result when available for user: principal", async () => {
    const userPrincipal = "user:cached-user";
    getBffAuthContextMock.mockResolvedValue({
      token: "cached-jwt",
      kind: "cookie",
      principal: userPrincipal,
    });
    const cachedData = { points: 999, level: 10 };
    cacheGetMock.mockResolvedValue(JSON.stringify(cachedData));

    const req = new NextRequest("http://localhost/api/v1/analytics/gamification-summary");
    const { GET } = await import("@/app/api/v1/analytics/gamification-summary/route");
    const response = await GET(req);

    const payload = await response.json();
    expect(payload.points).toBe(999);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/analytics/goal-progress — dual auth", () => {
  beforeEach(() => {
    vi.resetModules();
    getBffAuthContextMock.mockReset();
    fetchMock.mockReset();
    process.env.CORE_API_URL = "http://core.test";
  });

  it("makes fetch request with bearer token when params provided", async () => {
    const token = "goal-bearer-2";
    getBffAuthContextMock.mockResolvedValue({
      token,
      kind: "bearer",
      principal: `tk:${token.slice(0, 8)}`,
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [{ date: "2026-06-04", value: 5 }] }), { status: 200 }),
    );

    const req = new NextRequest(
      "http://localhost/api/v1/analytics/goal-progress?metric=steps&target=10000",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const { GET } = await import("@/app/api/v1/analytics/goal-progress/route");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe("GET /api/v1/analytics/meal-calories — dual auth", () => {
  beforeEach(() => {
    vi.resetModules();
    getBffAuthContextMock.mockReset();
    fetchMock.mockReset();
    process.env.CORE_API_URL = "http://core.test";
  });

  it("makes fetch request with bearer token when params provided", async () => {
    const token = "meal-bearer-3";
    getBffAuthContextMock.mockResolvedValue({
      token,
      kind: "bearer",
      principal: `tk:${token.slice(0, 8)}`,
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ today: 2050, limit: 2500 }), { status: 200 }),
    );

    const req = new NextRequest(
      "http://localhost/api/v1/analytics/meal-calories?date=2026-06-04",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const { GET } = await import("@/app/api/v1/analytics/meal-calories/route");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe("GET /api/v1/analytics/period-comparison — dual auth", () => {
  beforeEach(() => {
    vi.resetModules();
    getBffAuthContextMock.mockReset();
    fetchMock.mockReset();
    process.env.CORE_API_URL = "http://core.test";
  });

  it("makes fetch request with bearer token when params provided", async () => {
    const token = "period-bearer-4";
    getBffAuthContextMock.mockResolvedValue({
      token,
      kind: "bearer",
      principal: `tk:${token.slice(0, 8)}`,
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ this_week: 8000, last_week: 7500 }), { status: 200 }),
    );

    const req = new NextRequest(
      "http://localhost/api/v1/analytics/period-comparison?metric=steps",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const { GET } = await import("@/app/api/v1/analytics/period-comparison/route");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
  });
});
