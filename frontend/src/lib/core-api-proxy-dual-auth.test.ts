import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const cookiesMock = vi.hoisted(() => vi.fn());
const assertSameOriginMock = vi.hoisted(() => vi.fn());
const applyAuthCookiesMock = vi.hoisted(() => vi.fn());
const clearAuthCookiesMock = vi.hoisted(() => vi.fn());
const refreshCoreAuthMock = vi.hoisted(() => vi.fn());
const getOrCreateRequestIdMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/bff-origin-guard", () => ({
  assertSameOrigin: assertSameOriginMock,
}));

vi.mock("@/lib/bff-auth-session", () => ({
  applyAuthCookies: applyAuthCookiesMock,
  clearAuthCookies: clearAuthCookiesMock,
  refreshCoreAuth: refreshCoreAuthMock,
}));

vi.mock("@/lib/request-id", () => ({
  getOrCreateRequestId: getOrCreateRequestIdMock,
  REQUEST_ID_HEADER: "X-Request-ID",
}));

global.fetch = fetchMock as any;

function cookieStore(accessToken: string | null = null) {
  return {
    get: (name: string) =>
      name === "healthos.session" && accessToken
        ? { name, value: accessToken }
        : undefined,
  };
}

describe("coreProxy with dual auth (cookie + bearer)", () => {
  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    assertSameOriginMock.mockReset();
    applyAuthCookiesMock.mockReset();
    clearAuthCookiesMock.mockReset();
    refreshCoreAuthMock.mockReset();
    getOrCreateRequestIdMock.mockReset();
    fetchMock.mockReset();

    getOrCreateRequestIdMock.mockReturnValue("req-id-123");
    process.env.CORE_API_URL = "http://core.test";
    process.env.NODE_ENV = "development";
  });

  it("forwards bearer token in Authorization header when only bearer is present", async () => {
    cookiesMock.mockResolvedValue(cookieStore(null));
    const bearerToken = "bearer-token-only";
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "GET",
      headers: { Authorization: `Bearer ${bearerToken}` },
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    const { coreProxy } = await import("@/lib/core-api-proxy");
    const response = await coreProxy(req, "/v1/meals");

    expect(fetchMock).toHaveBeenCalled();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://core.test/v1/meals");
    expect(options.headers.Authorization).toBe(`Bearer ${bearerToken}`);
    expect(response.status).toBe(200);
  });

  it("forwards cookie token in Authorization header when only cookie is present", async () => {
    const cookieToken = "cookie-token-only";
    cookiesMock.mockResolvedValue(cookieStore(cookieToken));
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "GET",
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    const { coreProxy } = await import("@/lib/core-api-proxy");
    const response = await coreProxy(req, "/v1/meals");

    expect(fetchMock).toHaveBeenCalled();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://core.test/v1/meals");
    expect(options.headers.Authorization).toBe(`Bearer ${cookieToken}`);
    expect(response.status).toBe(200);
  });

  it("prioritizes cookie token over bearer when both are present", async () => {
    const cookieToken = "cookie-wins";
    const bearerToken = "bearer-loses";
    cookiesMock.mockResolvedValue(cookieStore(cookieToken));
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "GET",
      headers: { Authorization: `Bearer ${bearerToken}` },
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    const { coreProxy } = await import("@/lib/core-api-proxy");
    const response = await coreProxy(req, "/v1/meals");

    expect(fetchMock).toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe(`Bearer ${cookieToken}`);
  });

  it("does not retry 401 for bearer-only requests (no refresh token)", async () => {
    cookiesMock.mockResolvedValue(cookieStore(null));
    const bearerToken = "expired-bearer";
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "GET",
      headers: { Authorization: `Bearer ${bearerToken}` },
    });

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Token expired" } }),
        { status: 401 },
      ),
    );

    const { coreProxy } = await import("@/lib/core-api-proxy");
    const response = await coreProxy(req, "/v1/meals");

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retry
    expect(refreshCoreAuthMock).not.toHaveBeenCalled();
  });

  it("includes request ID in upstream fetch", async () => {
    cookiesMock.mockResolvedValue(cookieStore(null));
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "GET",
      headers: { Authorization: "Bearer token123" },
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    const { coreProxy } = await import("@/lib/core-api-proxy");
    await coreProxy(req, "/v1/meals");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["X-Request-ID"]).toBe("req-id-123");
  });

  it("handles multipart option correctly for bearer requests", async () => {
    cookiesMock.mockResolvedValue(cookieStore(null));
    const bearerToken = "multipart-bearer";
    const req = new NextRequest("http://localhost/api/v1/meals/analyze-photo", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "multipart/form-data; boundary=----boundary123",
      },
      body: new Blob(["mock body"]),
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ job_id: "job-123" }), { status: 202 }),
    );

    const { coreProxy } = await import("@/lib/core-api-proxy");
    const response = await coreProxy(req, "/v1/meals/analyze-photo", {
      multipart: true,
    });

    expect(response.status).toBe(202);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("applies extraHeaders for bearer requests", async () => {
    cookiesMock.mockResolvedValue(cookieStore(null));
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "POST",
      headers: { Authorization: "Bearer token456" },
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "meal-1" }), { status: 201 }),
    );

    const { coreProxy } = await import("@/lib/core-api-proxy");
    const response = await coreProxy(req, "/v1/meals", {
      extraHeaders: { "Idempotency-Key": "key-123" },
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["Idempotency-Key"]).toBe("key-123");
    expect(response.status).toBe(201);
  });
});
