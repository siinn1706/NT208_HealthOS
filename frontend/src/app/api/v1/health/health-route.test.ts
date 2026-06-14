import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchWithTimeoutMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/bff-fetch-utils", () => ({
  fetchWithTimeout: fetchWithTimeoutMock,
}));

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/v1/health route", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchWithTimeoutMock.mockReset();
    process.env.CORE_API_URL = "http://core.example";
  });

  it("returns Core readiness details when Core responds", async () => {
    fetchWithTimeoutMock.mockResolvedValue(
      jsonResponse({ status: "ok", db: "ok", redis: "ok" }),
    );

    const { GET } = await import("@/app/api/v1/health/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      status: "ok",
      core_api: "reachable",
      checks: { status: "ok", db: "ok", redis: "ok" },
    });
  });

  it("returns 503 quickly when Core readiness times out", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    fetchWithTimeoutMock.mockRejectedValue(abortError);

    const { GET } = await import("@/app/api/v1/health/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      status: "error",
      core_api: "timeout",
      checks: { status: "degraded", reason: "timeout" },
    });
    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      "http://core.example/health/ready",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
      2000,
    );
  });
});
