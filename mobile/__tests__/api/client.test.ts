/**
 * Tests for `src/api/client.ts` — verifies the wrapper actually does what
 * the rest of the app assumes:
 *   - prepends the base URL exactly once
 *   - attaches Bearer when a token is present and `auth !== false`
 *   - throws AUTH_REQUIRED before the network round-trip when token missing
 *   - emits `auth:expired` on 401
 *   - retries idempotent GETs once on 502/503/504, never on 4xx
 *   - sends multipart bodies without a JSON content-type
 *   - encodes query strings, skipping null/undefined
 */
import { ApiError } from "@/api/errors";
import { apiFetch, apiUpload } from "@/api/client";
import { sessionStore } from "@/auth/session";
import { appEvents } from "@/api/events";

const BASE = "http://10.0.2.2:8000";

interface MockResponseInit {
  status?: number;
  body?: unknown;
  contentType?: string;
}

function mockResponse({
  status = 200,
  body,
  contentType = "application/json",
}: MockResponseInit): Response {
  const text =
    body === undefined || body === null
      ? ""
      : typeof body === "string"
        ? body
        : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? contentType : null) },
    json: async () => (text ? JSON.parse(text) : null),
    text: async () => text,
  } as unknown as Response;
}

describe("apiFetch", () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    fetchSpy = jest.spyOn(global, "fetch" as never);
    await sessionStore.getState().setToken(null);
    sessionStore.getState().setUser(null);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("hits the configured Core BE base URL with /v1 paths", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: { ok: true } }));
    await sessionStore.getState().setToken("test-token");
    await apiFetch<{ ok: boolean }>("/v1/users/me");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${BASE}/v1/users/me`);
  });

  it("attaches Bearer token when authenticated", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: {} }));
    await sessionStore.getState().setToken("abc.def.ghi");
    await apiFetch<unknown>("/v1/users/me");

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer abc.def.ghi");
  });

  it("throws AUTH_REQUIRED before any fetch when token missing", async () => {
    await expect(apiFetch("/v1/users/me")).rejects.toBeInstanceOf(ApiError);
    await expect(apiFetch("/v1/users/me")).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows unauthenticated calls when auth: false", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: { available: true } }));
    await apiFetch<{ available: boolean }>("/v1/auth/check-email", {
      auth: false,
      query: { email: "x@y.z" },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("encodes query strings and skips null/undefined", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: {} }));
    await apiFetch<unknown>("/v1/health-metrics", {
      auth: false,
      query: { metric_type: "heart_rate", page: 1, missing: undefined, blank: null },
    });
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe(
      `${BASE}/v1/health-metrics?metric_type=heart_rate&page=1`
    );
  });

  it("emits auth:expired on 401 (and preserves backend code in the error)", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        status: 401,
        body: { error: { code: "INVALID_TOKEN", message: "Expired" } },
      })
    );
    await sessionStore.getState().setToken("expired-token");

    const events: Array<{ reason: string }> = [];
    const off = appEvents.on("auth:expired", (e) => events.push(e));

    // Backend-supplied code wins over the status-derived AUTH_EXPIRED default.
    await expect(apiFetch("/v1/users/me")).rejects.toMatchObject({
      code: "INVALID_TOKEN",
      status: 401,
    });
    off();
    // The auth:expired side-effect still fires regardless of which code came back.
    expect(events).toHaveLength(1);
    expect(events[0]?.reason).toBe("401");
  });

  it("falls back to AUTH_EXPIRED on 401 when backend supplies no code", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ status: 401, body: {} }));
    await sessionStore.getState().setToken("t");
    await expect(apiFetch("/v1/users/me")).rejects.toMatchObject({
      code: "AUTH_EXPIRED",
      status: 401,
    });
  });

  it("retries idempotent GET once on 503", async () => {
    fetchSpy
      .mockResolvedValueOnce(mockResponse({ status: 503, body: {} }))
      .mockResolvedValueOnce(mockResponse({ body: { ok: true } }));
    await sessionStore.getState().setToken("t");

    const result = await apiFetch<{ ok: boolean }>("/v1/users/me");
    expect(result).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not retry 4xx", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        status: 400,
        body: { error: { code: "VALIDATION_ERROR", message: "Bad" } },
      })
    );
    await sessionStore.getState().setToken("t");

    await expect(apiFetch("/v1/users/me")).rejects.toBeInstanceOf(ApiError);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not retry mutations on 503", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ status: 503, body: {} }));
    await sessionStore.getState().setToken("t");

    await expect(
      apiFetch("/v1/users/me", { method: "PATCH", body: { name: "x" } })
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("sends JSON body with proper content-type", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: {} }));
    await sessionStore.getState().setToken("t");

    await apiFetch("/v1/auth/login", {
      method: "POST",
      auth: false,
      body: { identifier: "u", password: "p" },
    });

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ identifier: "u", password: "p" }));
  });

  it("apiUpload sends FormData without forcing JSON content-type", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: { data: { id: "u1" } } }));
    await sessionStore.getState().setToken("t");

    const fd = new FormData();
    fd.append("name", "Test");

    await apiUpload<{ data: { id: string } }>("/v1/users/me/avatar", fd);
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
    expect(init.body).toBe(fd);
  });

  it("returns null for 204 No Content", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ status: 204, contentType: "" }));
    await sessionStore.getState().setToken("t");

    const result = await apiFetch<null>("/v1/reminders/abc", { method: "DELETE" });
    expect(result).toBeNull();
  });

  it("maps network errors to UPSTREAM_UNAVAILABLE", async () => {
    fetchSpy
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockRejectedValueOnce(new TypeError("Network request failed"));
    await sessionStore.getState().setToken("t");

    await expect(apiFetch("/v1/users/me")).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    });
  });
});
