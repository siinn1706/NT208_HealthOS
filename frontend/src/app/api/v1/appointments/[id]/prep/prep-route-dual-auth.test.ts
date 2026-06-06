import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const coreProxyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: coreProxyMock,
}));

describe("GET|PATCH /api/v1/appointments/[id]/prep — dual auth (cookie + bearer)", () => {
  beforeEach(() => {
    vi.resetModules();
    coreProxyMock.mockReset();
  });

  it("proxies GET with bearer token to /v1/appointments/{id}/prep", async () => {
    const req = new NextRequest("http://localhost/api/v1/appointments/appt-1/prep", {
      method: "GET",
      headers: { Authorization: "Bearer bearer-token-1" },
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { items: [] } }), { status: 200 }),
    );

    const { GET } = await import("@/app/api/v1/appointments/[id]/prep/route");
    const response = await GET(req, { params: Promise.resolve({ id: "appt-1" }) });

    expect(response.status).toBe(200);
    const [, path, opts] = coreProxyMock.mock.calls[0];
    expect(path).toBe("/v1/appointments/appt-1/prep");
    expect(opts?.method).toBe("GET");
  });

  it("proxies GET with cookie auth to /v1/appointments/{id}/prep", async () => {
    const req = new NextRequest("http://localhost/api/v1/appointments/appt-2/prep", {
      method: "GET",
      headers: { Cookie: "session=cookie-token" },
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { items: [] } }), { status: 200 }),
    );

    const { GET } = await import("@/app/api/v1/appointments/[id]/prep/route");
    const response = await GET(req, { params: Promise.resolve({ id: "appt-2" }) });

    expect(response.status).toBe(200);
    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/appointments/appt-2/prep",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("proxies PATCH with bearer token and body to /v1/appointments/{id}/prep", async () => {
    const req = new NextRequest("http://localhost/api/v1/appointments/appt-3/prep", {
      method: "PATCH",
      headers: { Authorization: "Bearer bearer-token-2", "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: "item-1", completed: true }] }),
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { items: [{ id: "item-1", completed: true }] } }), { status: 200 }),
    );

    const { PATCH } = await import("@/app/api/v1/appointments/[id]/prep/route");
    const response = await PATCH(req, { params: Promise.resolve({ id: "appt-3" }) });

    expect(response.status).toBe(200);
    const [, path, opts] = coreProxyMock.mock.calls[0];
    expect(path).toBe("/v1/appointments/appt-3/prep");
    expect(opts?.method).toBe("PATCH");
    expect(opts?.body).toBeDefined();
  });

  it("proxies PATCH with cookie auth and body to /v1/appointments/{id}/prep", async () => {
    const req = new NextRequest("http://localhost/api/v1/appointments/appt-4/prep", {
      method: "PATCH",
      headers: { Cookie: "session=cookie-token", "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: "item-2", completed: false }] }),
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { items: [{ id: "item-2", completed: false }] } }), { status: 200 }),
    );

    const { PATCH } = await import("@/app/api/v1/appointments/[id]/prep/route");
    const response = await PATCH(req, { params: Promise.resolve({ id: "appt-4" }) });

    expect(response.status).toBe(200);
    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/appointments/appt-4/prep",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("proxies PATCH with empty body fallback", async () => {
    const req = new NextRequest("http://localhost/api/v1/appointments/appt-5/prep", {
      method: "PATCH",
      headers: { Authorization: "Bearer bearer-token-3" },
    });
    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const { PATCH } = await import("@/app/api/v1/appointments/[id]/prep/route");
    const response = await PATCH(req, { params: Promise.resolve({ id: "appt-5" }) });

    expect(response.status).toBe(200);
    const [, , opts] = coreProxyMock.mock.calls[0];
    expect(opts?.body).toBeDefined();
  });
});
