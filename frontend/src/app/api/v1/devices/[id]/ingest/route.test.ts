import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const coreProxyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: coreProxyMock,
}));

describe("POST /api/v1/devices/[id]/ingest", () => {
  beforeEach(() => {
    vi.resetModules();
    coreProxyMock.mockReset();
  });

  it("forwards Idempotency-Key to Core ingest", async () => {
    const req = new NextRequest("http://localhost/api/v1/devices/dev-1/ingest", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-token",
        "Content-Type": "application/json",
        "Idempotency-Key": "hc-ingest-key-1",
      },
      body: JSON.stringify({ records: [] }),
    });

    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { inserted: 0 } }), { status: 200 }),
    );

    const { POST } = await import("@/app/api/v1/devices/[id]/ingest/route");
    const response = await POST(req, { params: Promise.resolve({ id: "dev-1" }) });

    expect(response.status).toBe(200);
    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/devices/dev-1/ingest",
      {
        method: "POST",
        extraHeaders: { "Idempotency-Key": "hc-ingest-key-1" },
      },
    );
  });

  it("does not forward an idempotency header when absent", async () => {
    const req = new NextRequest("http://localhost/api/v1/devices/dev%2F1/ingest", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [] }),
    });

    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { inserted: 0 } }), { status: 200 }),
    );

    const { POST } = await import("@/app/api/v1/devices/[id]/ingest/route");
    await POST(req, { params: Promise.resolve({ id: "dev/1" }) });

    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/devices/dev%2F1/ingest",
      {
        method: "POST",
        extraHeaders: undefined,
      },
    );
  });
});
