import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const coreProxyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: coreProxyMock,
}));

describe("GET /api/v1/mfa/status — dual auth (cookie + bearer)", () => {
  beforeEach(() => {
    vi.resetModules();
    coreProxyMock.mockReset();
  });

  it("proxies GET with bearer token to /v1/mfa/status", async () => {
    const req = new NextRequest("http://localhost/api/v1/mfa/status", {
      method: "GET",
      headers: { Authorization: "Bearer bearer-token-1" },
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { enabled: false } }), { status: 200 }),
    );

    const { GET } = await import("@/app/api/v1/mfa/status/route");
    const response = await GET(req);

    expect(response.status).toBe(200);
    const [, path, opts] = coreProxyMock.mock.calls[0];
    expect(path).toBe("/v1/mfa/status");
    expect(opts?.method).toBe("GET");
  });

  it("proxies GET with cookie auth to /v1/mfa/status", async () => {
    const req = new NextRequest("http://localhost/api/v1/mfa/status", {
      method: "GET",
      headers: { Cookie: "session=cookie-token" },
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { enabled: true } }), { status: 200 }),
    );

    const { GET } = await import("@/app/api/v1/mfa/status/route");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/mfa/status",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
