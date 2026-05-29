import { afterEach, describe, expect, it, vi } from "vitest";

import { bffFetchClient } from "@/lib/api-client";

function response(body: BodyInit | null, init: ResponseInit): Response {
  return new Response(body, init);
}

describe("bffFetchClient response parsing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns undefined data for 204, 205, and empty success bodies", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(null, { status: 204 }))
      .mockResolvedValueOnce(response(null, { status: 205 }))
      .mockResolvedValueOnce(response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(bffFetchClient("/api/v1/no-content")).resolves.toEqual({ data: undefined });
    await expect(bffFetchClient("/api/v1/reset-content")).resolves.toEqual({ data: undefined });
    await expect(bffFetchClient("/api/v1/empty")).resolves.toEqual({ data: undefined });
  });

  it("parses JSON success bodies and returns non-JSON success text", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(JSON.stringify({ data: { ok: true } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        response("accepted", {
          status: 202,
          headers: { "Content-Type": "text/plain" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(bffFetchClient("/api/v1/json")).resolves.toEqual({
      data: { data: { ok: true } },
    });
    await expect(bffFetchClient("/api/v1/text")).resolves.toEqual({ data: "accepted" });
  });

  it("returns a stable error envelope for empty or text error bodies", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response("", { status: 503, statusText: "Service Unavailable" }))
      .mockResolvedValueOnce(
        response("upstream down", {
          status: 502,
          headers: { "Content-Type": "text/plain" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(bffFetchClient("/api/v1/empty-error")).resolves.toEqual({
      error: { error: { code: "UNKNOWN", message: "Service Unavailable" } },
    });
    await expect(bffFetchClient("/api/v1/text-error")).resolves.toEqual({
      error: { error: { code: "UNKNOWN", message: "upstream down" } },
    });
  });

  it("keeps the client-side 401 redirect contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response("", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/dashboard/profile", href: "" },
    });

    const result = await bffFetchClient("/api/v1/users/me");

    expect(result).toEqual({ error: { code: "SESSION_EXPIRED" } });
    expect(window.location.href).toBe("/login?from=%2Fdashboard%2Fprofile");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
});
