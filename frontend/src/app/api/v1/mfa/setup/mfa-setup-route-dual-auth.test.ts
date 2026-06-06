import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const coreProxyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: coreProxyMock,
}));

describe("POST /api/v1/mfa/setup — dual auth (cookie + bearer)", () => {
  beforeEach(() => {
    vi.resetModules();
    coreProxyMock.mockReset();
  });

  it("proxies POST with bearer token to /v1/mfa/setup", async () => {
    const req = new NextRequest("http://localhost/api/v1/mfa/setup", {
      method: "POST",
      headers: { Authorization: "Bearer bearer-token-1" },
      body: JSON.stringify({}),
    });
    coreProxyMock.mockResolvedValue(
      new Response(
        JSON.stringify({ data: { secret: "JBSWY3DPEHPK3PXP", qr_code: "data:image/...", recovery_codes: ["a", "b"] } }),
        { status: 200 },
      ),
    );

    const { POST } = await import("@/app/api/v1/mfa/setup/route");
    const response = await POST(req);

    expect(response.status).toBe(200);
    const [, path, opts] = coreProxyMock.mock.calls[0];
    expect(path).toBe("/v1/mfa/setup");
    expect(opts?.method).toBe("POST");
  });

  it("proxies POST with cookie auth to /v1/mfa/setup", async () => {
    const req = new NextRequest("http://localhost/api/v1/mfa/setup", {
      method: "POST",
      headers: { Cookie: "session=cookie-token", "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );

    const { POST } = await import("@/app/api/v1/mfa/setup/route");
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/mfa/setup",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("proxies POST with empty body fallback", async () => {
    const req = new NextRequest("http://localhost/api/v1/mfa/setup", {
      method: "POST",
      headers: { Authorization: "Bearer bearer-token-2" },
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );

    const { POST } = await import("@/app/api/v1/mfa/setup/route");
    const response = await POST(req);

    expect(response.status).toBe(200);
    const [, , opts] = coreProxyMock.mock.calls[0];
    expect(opts?.body).toBeDefined();
  });
});
