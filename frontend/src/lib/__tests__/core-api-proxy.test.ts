import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("coreProxy refresh rotation", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

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
        headers: {
          Authorization: "Bearer meal-access",
          "Content-Type": "application/json",
          "Idempotency-Key": "meal-key-1",
        },
      }),
    );
  });

  it("forwards multipart creates without forcing a JSON content type", async () => {
    setCookieStore({ [SESSION_COOKIE_NAME]: "meal-access" });
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "meal-photo" } }, 201));

    const form = new FormData();
    form.set("name", "Photo meal");
    form.set("image", new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), "meal.png");

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
      formData: vi.fn().mockResolvedValue(form),
      text: vi.fn(),
    } as unknown as NextRequest;

    const response = await POST(req);
    const forwarded = fetchMock.mock.calls[0]?.[1] as RequestInit;

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { id: "meal-photo" } });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://core.example/v1/meals");
    expect(forwarded.method).toBe("POST");
    expect(forwarded.body).toBeInstanceOf(FormData);
    expect(forwarded.headers).toEqual({
      Authorization: "Bearer meal-access",
      "Idempotency-Key": "meal-photo-key",
    });
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
        headers: {
          Authorization: "Bearer meal-access",
          "Content-Type": "application/json",
          "Idempotency-Key": "legacy-meal-key",
        },
      }),
    );
  });
});
