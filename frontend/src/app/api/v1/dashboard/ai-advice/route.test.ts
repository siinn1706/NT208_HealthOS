import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const coreProxyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: coreProxyMock,
}));

describe("/api/v1/dashboard/ai-advice", () => {
  beforeEach(() => {
    vi.resetModules();
    coreProxyMock.mockReset();
  });

  it("forwards GET advice requests to Core", async () => {
    const req = new NextRequest("http://localhost/api/v1/dashboard/ai-advice?locale=en&surface=web", {
      method: "GET",
      headers: { Authorization: "Bearer bearer-token" },
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );

    const { GET } = await import("@/app/api/v1/dashboard/ai-advice/route");
    await GET(req);

    expect(coreProxyMock).toHaveBeenCalledWith(req, "/v1/dashboard/ai-advice");
  });
});
