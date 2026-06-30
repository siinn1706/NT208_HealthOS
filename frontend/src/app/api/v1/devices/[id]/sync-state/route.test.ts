import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const coreProxyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: coreProxyMock,
}));

describe("/api/v1/devices/[id]/sync-state", () => {
  beforeEach(() => {
    vi.resetModules();
    coreProxyMock.mockReset();
  });

  it("forwards GET sync-state to the encoded Core device path", async () => {
    const req = new NextRequest("http://localhost/api/v1/devices/dev%2F1/sync-state", {
      method: "GET",
      headers: { Authorization: "Bearer bearer-token" },
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    const { GET } = await import("@/app/api/v1/devices/[id]/sync-state/route");
    await GET(req, { params: Promise.resolve({ id: "dev/1" }) });

    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/devices/dev%2F1/sync-state",
    );
  });

  it("forwards PUT sync-state through the BFF for mobile token reset", async () => {
    const req = new NextRequest("http://localhost/api/v1/devices/dev%2F1/sync-state", {
      method: "PUT",
      headers: {
        Authorization: "Bearer bearer-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tokens: { Steps: null } }),
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    const { PUT } = await import("@/app/api/v1/devices/[id]/sync-state/route");
    await PUT(req, { params: Promise.resolve({ id: "dev/1" }) });

    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/devices/dev%2F1/sync-state",
      { method: "PUT" },
    );
  });
});
