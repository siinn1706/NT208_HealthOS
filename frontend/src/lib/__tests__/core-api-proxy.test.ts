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
});
