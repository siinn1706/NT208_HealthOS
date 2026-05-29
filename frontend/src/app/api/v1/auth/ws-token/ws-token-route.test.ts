import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

const cookiesMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const fetchWithTimeoutMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/bff-rate-limit", () => ({
  RATE_LIMITS: {
    "auth:ws_token": { key: "auth:ws_token", max: 30, windowSeconds: 60 },
  },
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("@/lib/bff-fetch-utils", () => ({
  fetchWithTimeout: fetchWithTimeoutMock,
}));

function request(): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/ws-token", {
    method: "GET",
  });
}

function cookieStore(accessToken: string | null) {
  return {
    get: (name: string) =>
      name === SESSION_COOKIE_NAME && accessToken
        ? { name, value: accessToken }
        : undefined,
  };
}

function coreResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/v1/auth/ws-token route", () => {
  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    enforceRateLimitMock.mockReset();
    fetchWithTimeoutMock.mockReset();
    enforceRateLimitMock.mockResolvedValue(null);
    process.env.CORE_API_URL = "http://core.example";
  });

  it("uses a hashed session principal for authenticated rate limiting", async () => {
    const sessionCookieValue = ["opaque", "cookie", "fixture"].join("-");
    cookiesMock.mockResolvedValue(cookieStore(sessionCookieValue));
    fetchWithTimeoutMock.mockResolvedValue(
      coreResponse({ data: { ws_ticket: "ticket-1", expires_in_seconds: 90 } }),
    );

    const { GET } = await import("@/app/api/v1/auth/ws-token/route");
    const response = await GET(request());
    const payload = await response.json();

    const expectedPrincipal = `session:${createHash("sha256").update(sessionCookieValue).digest("hex")}`;
    expect(response.status).toBe(200);
    expect(payload).toEqual({ token: "ticket-1", expires_in_seconds: 90 });
    expect(enforceRateLimitMock).toHaveBeenCalledTimes(2);
    expect(enforceRateLimitMock).toHaveBeenNthCalledWith(
      1,
      expect.any(NextRequest),
      expect.objectContaining({
        key: "auth:ws_token:session_cookie",
        fallbackPrincipal: "session-cookie-present",
        logUnresolvedIp: false,
      }),
    );
    expect(enforceRateLimitMock).toHaveBeenNthCalledWith(
      2,
      expect.any(NextRequest),
      expect.objectContaining({
        key: "auth:ws_token",
        principal: expectedPrincipal,
      }),
    );
    expect(JSON.stringify(enforceRateLimitMock.mock.calls.map(([, opts]) => opts))).not.toContain(
      sessionCookieValue,
    );
    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      "http://core.example/v1/auth/ws-ticket",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: `Bearer ${sessionCookieValue}`,
        }),
      }),
    );
  });

  it("keeps unauthenticated calls rate limited before returning 401", async () => {
    cookiesMock.mockResolvedValue(cookieStore(null));

    const { GET } = await import("@/app/api/v1/auth/ws-token/route");
    const response = await GET(request());
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      error: { code: "AUTH_REQUIRED", message: "No active session." },
    });
    expect(enforceRateLimitMock).toHaveBeenCalledWith(
      expect.any(NextRequest),
      { key: "auth:ws_token", max: 30, windowSeconds: 60 },
    );
    expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
  });

  it("returns the existing 429 response when the limiter blocks", async () => {
    cookiesMock.mockResolvedValue(cookieStore(["blocked", "cookie"].join("-")));
    enforceRateLimitMock.mockResolvedValue(
      new Response(
        '{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests. Please try again later."}}',
        { status: 429, headers: { "Retry-After": "30" } },
      ),
    );

    const { GET } = await import("@/app/api/v1/auth/ws-token/route");
    const response = await GET(request());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(await response.text()).toBe(
      '{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests. Please try again later."}}',
    );
    expect(enforceRateLimitMock).toHaveBeenCalledTimes(1);
    expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
  });

  it("preserves upstream error response shape", async () => {
    cookiesMock.mockResolvedValue(cookieStore(["upstream", "denied", "cookie"].join("-")));
    fetchWithTimeoutMock.mockResolvedValue(
      coreResponse(
        { error: { code: "UPSTREAM_DENIED", message: "No ticket." } },
        502,
      ),
    );

    const { GET } = await import("@/app/api/v1/auth/ws-token/route");
    const response = await GET(request());
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toEqual({
      error: { code: "UPSTREAM_DENIED", message: "No ticket." },
    });
  });

  it("returns 503 when Core is unavailable", async () => {
    cookiesMock.mockResolvedValue(cookieStore(["core", "unavailable", "cookie"].join("-")));
    fetchWithTimeoutMock.mockRejectedValue(new Error("network"));

    const { GET } = await import("@/app/api/v1/auth/ws-token/route");
    const response = await GET(request());
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message: "Core service is temporarily unavailable.",
      },
    });
  });
});
