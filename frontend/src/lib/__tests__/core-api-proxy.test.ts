import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  META_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/bff-auth-cookie";

const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

function setCookieStore(values: Record<string, string>) {
  cookiesMock.mockResolvedValue({
    get: (name: string) =>
      values[name] ? { name, value: values[name] } : undefined,
  });
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const REQUEST_ID_HEADER = "X-Request-ID";

describe("coreProxy refresh rotation", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  afterEach(() => {
    delete process.env.BFF_DASHBOARD_PERF_LOG;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.CORE_API_URL = "http://core.example";
  });

  it("refreshes once and retries the original request", async () => {
    setCookieStore({
      [SESSION_COOKIE_NAME]: "old-access",
      [REFRESH_COOKIE_NAME]: "old-refresh",
    });

    let coreCalls = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/v1/auth/refresh")) {
        return jsonResponse(
          {
            data: {
              access_token: "new-access",
              refresh_token: "new-refresh",
              user_id: "u1",
              email: "u1@example.com",
              username: "u1",
              display_name: "User One",
              avatar_url: null,
              onboarding_status: "completed",
            },
          },
          200,
        );
      }

      coreCalls += 1;
      if (coreCalls === 1) {
        return jsonResponse(
          { error: { code: "AUTH_INVALID_TOKEN", message: "Expired" } },
          401,
        );
      }
      return jsonResponse({ data: { ok: true } }, 200);
    });

    const { coreProxy } = await import("@/lib/core-api-proxy");
    const req = new NextRequest("http://localhost/api/v1/devices", { method: "GET" });
    const response = await coreProxy(req, "/v1/devices");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { ok: true } });
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe("new-access");
    expect(response.cookies.get(REFRESH_COOKIE_NAME)?.value).toBe("new-refresh");
    expect(response.cookies.get(META_COOKIE_NAME)?.value).toContain("completed");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("emits an opt-in duration log for dashboard performance proxy paths", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "access-token" });
    process.env.BFF_DASHBOARD_PERF_LOG = "true";
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }, 200));

    const { coreProxy } = await import("@/lib/core-api-proxy");
    const req = new NextRequest("http://localhost/api/v1/reports/trends/batch", {
      method: "GET",
    });
    const response = await coreProxy(req, "/v1/reports/trends/batch");

    expect(response.status).toBe(200);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy.mock.calls[0]?.[0]).toContain(
      "bff_core_proxy_duration method=GET path=/v1/reports/trends/batch status=200",
    );
  });

  it("clears auth cookies when refresh fails", async () => {
    setCookieStore({
      [SESSION_COOKIE_NAME]: "old-access",
      [REFRESH_COOKIE_NAME]: "old-refresh",
    });

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/v1/auth/refresh")) {
        return jsonResponse(
          { error: { code: "INVALID_REFRESH_TOKEN", message: "Invalid" } },
          401,
        );
      }
      return jsonResponse(
        { error: { code: "AUTH_INVALID_TOKEN", message: "Expired" } },
        401,
      );
    });

    const { coreProxy } = await import("@/lib/core-api-proxy");
    const req = new NextRequest("http://localhost/api/v1/reports", { method: "GET" });
    const response = await coreProxy(req, "/v1/reports");
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      error: { code: "AUTH_REQUIRED", message: "Session expired. Please sign in again." },
    });
    expect(response.cookies.getAll().map((cookie) => cookie.name)).toEqual(
      expect.arrayContaining([
        SESSION_COOKIE_NAME,
        META_COOKIE_NAME,
        REFRESH_COOKIE_NAME,
      ]),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent refresh requests for the same token", async () => {
    setCookieStore({
      [SESSION_COOKIE_NAME]: "old-access",
      [REFRESH_COOKIE_NAME]: "old-refresh",
    });

    let refreshCalls = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1/auth/refresh")) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return jsonResponse(
          {
            data: {
              access_token: "new-access",
              refresh_token: "new-refresh",
              user_id: "u1",
              email: "u1@example.com",
              username: "u1",
              display_name: "User One",
              avatar_url: null,
              onboarding_status: "completed",
            },
          },
          200,
        );
      }

      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
      if (auth === "Bearer old-access") {
        return jsonResponse(
          { error: { code: "AUTH_INVALID_TOKEN", message: "Expired" } },
          401,
        );
      }
      if (auth === "Bearer new-access") {
        return jsonResponse({ data: { ok: true } }, 200);
      }
      return jsonResponse({ error: { code: "UNKNOWN", message: "Unexpected" } }, 500);
    });

    const { coreProxy } = await import("@/lib/core-api-proxy");
    const requestA = new NextRequest("http://localhost/api/v1/medications", { method: "GET" });
    const requestB = new NextRequest("http://localhost/api/v1/medications", { method: "GET" });
    const [resA, resB] = await Promise.all([
      coreProxy(requestA, "/v1/medications"),
      coreProxy(requestB, "/v1/medications"),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(refreshCalls).toBe(1);
  });

  it("passes through empty 204 responses without adding a JSON body", async () => {
    setCookieStore({
      [SESSION_COOKIE_NAME]: "access-token",
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const { coreProxy } = await import("@/lib/core-api-proxy");
    const req = new NextRequest("http://localhost/api/v1/conversations/c1/leave", {
      method: "POST",
      headers: {
        host: "localhost",
        origin: "http://localhost",
      },
    });
    const response = await coreProxy(req, "/v1/conversations/c1/leave", { method: "POST" });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});

describe("meals BFF route", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.CORE_API_URL = "http://core.example";
  });

  it("forwards JSON creates to Core with bearer auth", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "meal-access" });
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "meal-1" } }, 201));

    const payload = { name: "Manual meal", meal_type: "lunch", ingredients: [] };
    const { POST } = await import("@/app/api/v1/meals/route");
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "meal-key-1",
        host: "localhost",
        origin: "http://localhost",
      },
      body: JSON.stringify(payload),
    });

    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { id: "meal-1" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://core.example/v1/meals",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer meal-access",
          "Content-Type": "application/json",
          "Idempotency-Key": "meal-key-1",
        }),
      }),
    );
  });

  it("forwards multipart creates without forcing a JSON content type", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "meal-access" });
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "meal-photo" } }, 201));

    const rawBody = new Uint8Array([1, 2, 3]).buffer;

    const { POST } = await import("@/app/api/v1/meals/route");
    const req = {
      method: "POST",
      nextUrl: new URL("http://localhost/api/v1/meals"),
      headers: new Headers({
        "content-type": "multipart/form-data; boundary=test",
        "idempotency-key": "meal-photo-key",
        host: "localhost",
        origin: "http://localhost",
      }),
      arrayBuffer: vi.fn().mockResolvedValue(rawBody),
      text: vi.fn(),
    } as unknown as NextRequest;

    const response = await POST(req);
    const forwarded = fetchMock.mock.calls[0]?.[1] as RequestInit;

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { id: "meal-photo" } });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://core.example/v1/meals");
    expect(forwarded.method).toBe("POST");
    expect(forwarded.body).toBeInstanceOf(ArrayBuffer);
    expect(forwarded.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer meal-access",
        "Idempotency-Key": "meal-photo-key",
        "Content-Type": "multipart/form-data; boundary=test",
      }),
    );
  });

  it("forwards meal deletes to Core with bearer auth", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "meal-access" });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const { DELETE } = await import("@/app/api/v1/meals/[meal_id]/route");
    const req = new NextRequest("http://localhost/api/v1/meals/meal-1", {
      method: "DELETE",
      headers: {
        host: "localhost",
        origin: "http://localhost",
      },
    });

    const response = await DELETE(req, { params: Promise.resolve({ meal_id: "meal-1" }) });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://core.example/v1/meals/meal-1",
      expect.objectContaining({
        method: "DELETE",
        body: undefined,
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer meal-access",
          "Content-Type": "application/json",
          [REQUEST_ID_HEADER]: expect.any(String),
        }),
      }),
    );
  });
});

describe("medication history BFF route", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.CORE_API_URL = "http://core.example";
  });

  it("forwards medication history query params to Core", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "med-access" });
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }, 200));

    const { GET } = await import("@/app/api/v1/medications/history/route");
    const req = new NextRequest("http://localhost/api/v1/medications/history?from=2026-05-01T00%3A00%3A00Z&to=2026-06-01T00%3A00%3A00Z", {
      method: "GET",
      headers: {
        host: "localhost",
        origin: "http://localhost",
      },
    });

    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://core.example/v1/medications/history?from=2026-05-01T00%3A00%3A00Z&to=2026-06-01T00%3A00%3A00Z",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer med-access",
          [REQUEST_ID_HEADER]: expect.any(String),
        }),
      }),
    );
  });
});

describe("appointments BFF route", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.CORE_API_URL = "http://core.example";
  });

  it("forwards video join URL fields through appointment creates and updates", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "appointment-access" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: { id: "apt-video" } }, 201))
      .mockResolvedValueOnce(jsonResponse({ data: { id: "apt-video" } }, 200));

    const createPayload = {
      appointment_date: "2026-06-05T08:00:00.000Z",
      doctor_name: "Dr Video",
      visit_type: "video",
      video_join_url: "https://meet.example/room-123",
    };
    const updatePayload = { video_join_url: "https://meet.example/room-456" };

    const createRoute = await import("@/app/api/v1/appointments/route");
    const updateRoute = await import("@/app/api/v1/appointments/[id]/route");
    const createReq = new NextRequest("http://localhost/api/v1/appointments", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost", origin: "http://localhost" },
      body: JSON.stringify(createPayload),
    });
    const updateReq = new NextRequest("http://localhost/api/v1/appointments/apt-video", {
      method: "PATCH",
      headers: { "content-type": "application/json", host: "localhost", origin: "http://localhost" },
      body: JSON.stringify(updatePayload),
    });

    const created = await createRoute.POST(createReq);
    const updated = await updateRoute.PATCH(updateReq, { params: Promise.resolve({ id: "apt-video" }) });

    expect(created.status).toBe(201);
    expect(updated.status).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://core.example/v1/appointments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(createPayload),
        headers: expect.objectContaining({
          Authorization: "Bearer appointment-access",
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://core.example/v1/appointments/apt-video",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(updatePayload),
        headers: expect.objectContaining({
          Authorization: "Bearer appointment-access",
          "Content-Type": "application/json",
        }),
      }),
    );
  });
});

describe("appointment assets BFF routes", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.CORE_API_URL = "http://core.example";
  });

  it("forwards current-user appointment asset queries to Core", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "asset-access" });
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }, 200));

    const { GET } = await import("@/app/api/v1/appointment-assets/route");
    const req = new NextRequest("http://localhost/api/v1/appointment-assets?kind=lab_report&limit=50", {
      method: "GET",
      headers: { host: "localhost", origin: "http://localhost" },
    });

    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://core.example/v1/appointment-assets?kind=lab_report&limit=50",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer asset-access",
          [REQUEST_ID_HEADER]: expect.any(String),
        }),
      }),
    );
  });

  it("forwards appointment asset multipart uploads without forcing JSON content type", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "asset-access" });
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "asset-1" } }, 201));

    const { POST } = await import("@/app/api/v1/appointments/[id]/assets/route");
    const req = new NextRequest("http://localhost/api/v1/appointments/apt-1/assets", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=asset",
        host: "localhost",
        origin: "http://localhost",
      },
      body: "--asset\r\ncontent\r\n--asset--",
    });

    const response = await POST(req, { params: Promise.resolve({ id: "apt-1" }) });
    const forwarded = fetchMock.mock.calls[0]?.[1] as RequestInit;

    expect(response.status).toBe(201);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://core.example/v1/appointments/apt-1/assets");
    expect(forwarded.method).toBe("POST");
    expect(forwarded.body).toBeInstanceOf(ArrayBuffer);
    expect(forwarded.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer asset-access",
        "Content-Type": "multipart/form-data; boundary=asset",
        [REQUEST_ID_HEADER]: expect.any(String),
      }),
    );
  });

  it("forwards appointment asset signed-url and delete routes", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "asset-access" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: { url: "https://signed.example/file.pdf" } }, 200))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const urlRoute = await import("@/app/api/v1/appointments/[id]/assets/[assetId]/url/route");
    const deleteRoute = await import("@/app/api/v1/appointments/[id]/assets/[assetId]/route");
    const ctx = { params: Promise.resolve({ id: "apt-1", assetId: "asset-1" }) };

    const signed = await urlRoute.GET(new NextRequest("http://localhost/api/v1/appointments/apt-1/assets/asset-1/url", {
      method: "GET",
      headers: { host: "localhost", origin: "http://localhost" },
    }), ctx);
    const removed = await deleteRoute.DELETE(new NextRequest("http://localhost/api/v1/appointments/apt-1/assets/asset-1", {
      method: "DELETE",
      headers: { host: "localhost", origin: "http://localhost" },
    }), ctx);

    expect(signed.status).toBe(200);
    expect(removed.status).toBe(204);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://core.example/v1/appointments/apt-1/assets/asset-1/url");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://core.example/v1/appointments/apt-1/assets/asset-1");
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).method).toBe("DELETE");
  });
});

describe("legacy health-data meal route", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.CORE_API_URL = "http://core.example";
  });

  it("forwards JSON creates with the same idempotency contract", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "meal-access" });
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "legacy-meal" } }, 201));

    const payload = { name: "Legacy manual meal" };
    const { POST } = await import("@/app/api/v1/health-data/meal/route");
    const req = new NextRequest("http://localhost/api/v1/health-data/meal", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "legacy-meal-key",
        host: "localhost",
        origin: "http://localhost",
      },
      body: JSON.stringify(payload),
    });

    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://core.example/v1/meals",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer meal-access",
          "Content-Type": "application/json",
          "Idempotency-Key": "legacy-meal-key",
          [REQUEST_ID_HEADER]: expect.any(String),
        }),
      }),
    );
  });

  it("deprecates the legacy aggregate GET without calling Core", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "meal-access" });
    const { GET } = await import("@/app/api/v1/health-data/route");

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload.error.code).toBe("ENDPOINT_GONE");
    expect(payload.error.details.replacements).toEqual([
      "/api/v1/dashboard/summary",
      "/api/v1/vitals/timeseries",
      "/api/v1/meals",
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proxies legacy root JSON meal creates through the shared Core proxy", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "meal-access" });
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "legacy-root" } }, 201));

    const payload = { name: "Root legacy meal" };
    const { POST } = await import("@/app/api/v1/health-data/route");
    const req = new NextRequest("http://localhost/api/v1/health-data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "legacy-root-key",
        host: "localhost",
        origin: "http://localhost",
      },
      body: JSON.stringify(payload),
    });

    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://core.example/v1/meals",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer meal-access",
          "Content-Type": "application/json",
          "Idempotency-Key": "legacy-root-key",
          [REQUEST_ID_HEADER]: expect.any(String),
        }),
      }),
    );
  });

  it("preserves multipart boundary and enforces shared upload limits for legacy root creates", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "meal-access" });
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "legacy-photo" } }, 201));

    const { POST } = await import("@/app/api/v1/health-data/route");
    const req = new NextRequest("http://localhost/api/v1/health-data", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=legacy",
        "idempotency-key": "legacy-photo-key",
        host: "localhost",
        origin: "http://localhost",
      },
      body: "--legacy\r\ncontent\r\n--legacy--",
    });

    const response = await POST(req);
    const forwarded = fetchMock.mock.calls[0]?.[1] as RequestInit;

    expect(response.status).toBe(201);
    expect(forwarded.body).toBeInstanceOf(ArrayBuffer);
    expect(forwarded.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer meal-access",
        "Content-Type": "multipart/form-data; boundary=legacy",
        "Idempotency-Key": "legacy-photo-key",
        [REQUEST_ID_HEADER]: expect.any(String),
      }),
    );
  });

  it("rejects oversized multipart legacy creates before calling Core", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "meal-access" });
    const oversizedLength = String(10 * 1_048_576 + 1);
    const routes = [
      await import("@/app/api/v1/health-data/route"),
      await import("@/app/api/v1/health-data/meal/route"),
    ];

    for (const route of routes) {
      fetchMock.mockClear();
      const req = new NextRequest("http://localhost/api/v1/health-data", {
        method: "POST",
        headers: {
          "content-type": "multipart/form-data; boundary=legacy",
          "content-length": oversizedLength,
          host: "localhost",
          origin: "http://localhost",
        },
      });

      const response = await route.POST(req);
      const payload = await response.json();

      expect(response.status).toBe(413);
      expect(payload.error.code).toBe("PAYLOAD_TOO_LARGE");
      expect(response.headers.get(REQUEST_ID_HEADER)).toBeTruthy();
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });
});

describe("coreFetchStream auth refresh", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.CORE_API_URL = "http://core.example";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("refreshes expired access before opening the SSE stream and retries once", async () => {
    setCookieStore({
      [SESSION_COOKIE_NAME]: "old-access",
      [REFRESH_COOKIE_NAME]: "old-refresh",
    });

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1/auth/refresh")) {
        return jsonResponse(
          {
            data: {
              access_token: "new-access",
              refresh_token: "new-refresh",
              user_id: "u1",
              email: "u1@example.com",
              username: "u1",
              display_name: "User One",
              avatar_url: null,
              onboarding_status: "completed",
            },
          },
          200,
        );
      }

      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
      if (auth === "Bearer old-access") {
        return jsonResponse({ error: { code: "AUTH_INVALID_TOKEN", message: "Expired" } }, 401);
      }
      return new Response("data: ok\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    });

    const { coreFetchStream } = await import("@/lib/core-api-proxy");
    const req = new NextRequest("http://localhost/api/v1/conversations/c1/messages/stream", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "localhost",
        origin: "http://localhost",
      },
      body: JSON.stringify({ message: "hello" }),
    });

    const response = await coreFetchStream(req, "/v1/conversations/c1/messages/stream", {
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("data: ok\n\n");
    expect(response.headers.get("set-cookie")).toContain(SESSION_COOKIE_NAME);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[2]?.[1] as RequestInit).headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer new-access" }),
    );
  });

  it("refreshes before returning AUTH_REQUIRED when access is missing but refresh exists", async () => {
    setCookieStore({ [REFRESH_COOKIE_NAME]: "old-refresh" });

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/v1/auth/refresh")) {
        return jsonResponse(
          {
            data: {
              access_token: "new-access",
              refresh_token: "new-refresh",
              user_id: "u1",
              email: "u1@example.com",
            },
          },
          200,
        );
      }
      return new Response("data: ok\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    });

    const { coreFetchStream } = await import("@/lib/core-api-proxy");
    const req = new NextRequest("http://localhost/api/v1/conversations/c1/messages/stream", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "localhost",
        origin: "http://localhost",
      },
      body: JSON.stringify({ message: "hello" }),
    });

    const response = await coreFetchStream(req, "/v1/conversations/c1/messages/stream", {
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer new-access" }),
    );
  });

  it("clears auth cookies when stream refresh fails", async () => {
    setCookieStore({
      [SESSION_COOKIE_NAME]: "old-access",
      [REFRESH_COOKIE_NAME]: "old-refresh",
    });
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/v1/auth/refresh")) {
        return jsonResponse({ error: { code: "INVALID_REFRESH_TOKEN" } }, 401);
      }
      return jsonResponse({ error: { code: "AUTH_INVALID_TOKEN" } }, 401);
    });

    const { coreFetchStream } = await import("@/lib/core-api-proxy");
    const req = new NextRequest("http://localhost/api/v1/conversations/c1/messages/stream", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "localhost",
        origin: "http://localhost",
      },
      body: JSON.stringify({ message: "hello" }),
    });

    const response = await coreFetchStream(req, "/v1/conversations/c1/messages/stream", {
      method: "POST",
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.code).toBe("AUTH_REQUIRED");
    expect(response.headers.get("set-cookie")).toContain(SESSION_COOKIE_NAME);
    expect(response.headers.get("set-cookie")).toContain(REFRESH_COOKIE_NAME);
  });

  it("uses the inbound abort signal for SSE and does not create a timeout", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "access-token" });
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    fetchMock.mockResolvedValue(
      new Response("data: ok\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const { coreFetchStream } = await import("@/lib/core-api-proxy");
    const req = new NextRequest("http://localhost/api/v1/conversations/c1/messages/stream", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "localhost",
        origin: "http://localhost",
      },
      body: JSON.stringify({ message: "hello" }),
    });

    const response = await coreFetchStream(req, "/v1/conversations/c1/messages/stream", {
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal).toBe(req.signal);
    expect(timeoutSpy).not.toHaveBeenCalled();
  });

  it("returns stable JSON when the upstream stream fetch fails before headers", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "access-token" });
    fetchMock.mockRejectedValue(new Error("connect refused"));

    const { coreFetchStream } = await import("@/lib/core-api-proxy");
    const req = new NextRequest("http://localhost/api/v1/conversations/c1/messages/stream", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "localhost",
        origin: "http://localhost",
      },
      body: JSON.stringify({ message: "hello" }),
    });

    const response = await coreFetchStream(req, "/v1/conversations/c1/messages/stream", {
      method: "POST",
    });
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toEqual({
      code: "UPSTREAM_UNAVAILABLE",
      message: "Core service is temporarily unavailable.",
    });
    expect(response.headers.get(REQUEST_ID_HEADER)).toBeTruthy();
  });

  it("rejects multibyte stream request bodies by byte length", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "access-token" });
    const { coreFetchStream } = await import("@/lib/core-api-proxy");
    const req = new NextRequest("http://localhost/api/v1/conversations/c1/messages/stream", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "localhost",
        origin: "http://localhost",
      },
      body: "é",
    });

    const response = await coreFetchStream(req, "/v1/conversations/c1/messages/stream", {
      method: "POST",
      bodySizeLimit: 1,
    });
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload.error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(response.headers.get(REQUEST_ID_HEADER)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps refreshed cookies when the route wrapper returns the SSE response", async () => {
    setCookieStore({
      [SESSION_COOKIE_NAME]: "old-access",
      [REFRESH_COOKIE_NAME]: "old-refresh",
    });

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1/auth/refresh")) {
        return jsonResponse(
          {
            data: {
              access_token: "new-access",
              refresh_token: "new-refresh",
              user_id: "u1",
              email: "u1@example.com",
            },
          },
          200,
        );
      }
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
      if (auth === "Bearer old-access") {
        return jsonResponse({ error: { code: "AUTH_INVALID_TOKEN" } }, 401);
      }
      return new Response("data: ok\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    });

    const { POST } = await import("@/app/api/v1/conversations/[id]/messages/stream/route");
    const req = new NextRequest("http://localhost/api/v1/conversations/c1/messages/stream", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "localhost",
        origin: "http://localhost",
      },
      body: JSON.stringify({ message: "hello" }),
    });

    const response = await POST(req, { params: Promise.resolve({ id: "c1" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(SESSION_COOKIE_NAME);
    expect(await response.text()).toBe("data: ok\n\n");
  });
});
