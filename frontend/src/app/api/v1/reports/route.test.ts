import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const coreProxyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: coreProxyMock,
}));

describe("/api/v1/reports", () => {
  beforeEach(() => {
    vi.resetModules();
    coreProxyMock.mockReset();
  });

  it("forwards GET reports to Core", async () => {
    const req = new NextRequest("http://localhost/api/v1/reports?period=7d", {
      method: "GET",
      headers: { Authorization: "Bearer bearer-token" },
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );

    const { GET } = await import("@/app/api/v1/reports/route");
    await GET(req);

    expect(coreProxyMock).toHaveBeenCalledWith(req, "/v1/reports");
  });

  it("forwards POST report generation to Core", async () => {
    const req = new NextRequest("http://localhost/api/v1/reports?period=7d", {
      method: "POST",
      headers: { Authorization: "Bearer bearer-token" },
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );

    const { POST } = await import("@/app/api/v1/reports/route");
    await POST(req);

    expect(coreProxyMock).toHaveBeenCalledWith(req, "/v1/reports", { method: "POST" });
  });
});
