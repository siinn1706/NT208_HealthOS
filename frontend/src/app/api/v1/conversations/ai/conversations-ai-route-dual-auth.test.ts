import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const coreProxyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: coreProxyMock,
}));

describe("POST /api/v1/conversations/ai — dual auth (cookie + bearer)", () => {
  beforeEach(() => {
    vi.resetModules();
    coreProxyMock.mockReset();
  });

  it("proxies POST with bearer token to /v1/conversations/ai", async () => {
    const req = new NextRequest("http://localhost/api/v1/conversations/ai", {
      method: "POST",
      headers: { Authorization: "Bearer bearer-token-1", "Content-Type": "application/json" },
      body: JSON.stringify({ initial_message: "Hello" }),
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "conv-1" } }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/conversations/ai/route");
    const response = await POST(req);

    expect(response.status).toBe(201);
    const [, path, opts] = coreProxyMock.mock.calls[0];
    expect(path).toBe("/v1/conversations/ai");
    expect(opts?.method).toBe("POST");
  });

  it("proxies POST with cookie auth to /v1/conversations/ai", async () => {
    const req = new NextRequest("http://localhost/api/v1/conversations/ai", {
      method: "POST",
      headers: { Cookie: "session=cookie-token", "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "conv-2" } }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/conversations/ai/route");
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/conversations/ai",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("proxies POST with empty body to /v1/conversations/ai", async () => {
    const req = new NextRequest("http://localhost/api/v1/conversations/ai", {
      method: "POST",
      headers: { Authorization: "Bearer bearer-token-2" },
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "conv-3" } }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/conversations/ai/route");
    const response = await POST(req);

    expect(response.status).toBe(201);
    const [, , opts] = coreProxyMock.mock.calls[0];
    expect(opts?.body).toBeDefined();
  });
});
