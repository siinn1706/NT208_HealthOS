import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const coreProxyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: coreProxyMock,
}));

describe("POST /api/v1/health-goals — dual auth (cookie + bearer)", () => {
  beforeEach(() => {
    vi.resetModules();
    coreProxyMock.mockReset();
  });

  it("handles GET request with bearer token", async () => {
    const req = new NextRequest("http://localhost/api/v1/health-goals", {
      method: "GET",
      headers: { Authorization: "Bearer bearer-goals-1" },
    });

    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    const { GET } = await import("@/app/api/v1/health-goals/route");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(coreProxyMock).toHaveBeenCalledWith(req, "/v1/health-goals");
  });

  it("handles POST request with bearer token", async () => {
    const req = new NextRequest("http://localhost/api/v1/health-goals", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-goals-2",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "walk daily", target: 10000 }),
    });

    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "goal-1" }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/health-goals/route");
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(coreProxyMock).toHaveBeenCalledWith(req, "/v1/health-goals");
  });
});

describe("PATCH /api/v1/health-goals/[id] — dual auth (cookie + bearer)", () => {
  beforeEach(() => {
    vi.resetModules();
    coreProxyMock.mockReset();
  });

  it("handles PATCH request with bearer token and goal id", async () => {
    const goalId = "goal-123";
    const req = new NextRequest("http://localhost/api/v1/health-goals/goal-123", {
      method: "PATCH",
      headers: {
        Authorization: "Bearer bearer-goals-3",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: 15000 }),
    });

    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ id: goalId, target: 15000 }), { status: 200 }),
    );

    const ctx = { params: Promise.resolve({ id: goalId }) };
    const { PATCH } = await import("@/app/api/v1/health-goals/[id]/route");
    const response = await PATCH(req, ctx);

    expect(response.status).toBe(200);
    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      `/v1/health-goals/${goalId}`,
    );
  });

  it("forwards correct path for PATCH with different goal id", async () => {
    const goalId = "goal-xyz-789";
    const req = new NextRequest("http://localhost/api/v1/health-goals/goal-xyz-789", {
      method: "PATCH",
      headers: {
        Authorization: "Bearer bearer-goals-4",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "updated name" }),
    });

    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ id: goalId }), { status: 200 }),
    );

    const ctx = { params: Promise.resolve({ id: goalId }) };
    const { PATCH } = await import("@/app/api/v1/health-goals/[id]/route");
    await PATCH(req, ctx);

    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      `/v1/health-goals/${goalId}`,
    );
  });
});

describe("DELETE /api/v1/health-goals/[id] — dual auth (cookie + bearer)", () => {
  beforeEach(() => {
    vi.resetModules();
    coreProxyMock.mockReset();
  });

  it("handles DELETE request with bearer token and goal id", async () => {
    const goalId = "goal-456";
    const req = new NextRequest("http://localhost/api/v1/health-goals/goal-456", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer bearer-goals-5",
      },
    });

    coreProxyMock.mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    const ctx = { params: Promise.resolve({ id: goalId }) };
    const { DELETE } = await import("@/app/api/v1/health-goals/[id]/route");
    const response = await DELETE(req, ctx);

    expect(response.status).toBe(204);
    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      `/v1/health-goals/${goalId}`,
    );
  });

  it("forwards correct path for DELETE with different goal id", async () => {
    const goalId = "goal-abc-999";
    const req = new NextRequest("http://localhost/api/v1/health-goals/goal-abc-999", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer bearer-goals-6",
      },
    });

    coreProxyMock.mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    const ctx = { params: Promise.resolve({ id: goalId }) };
    const { DELETE } = await import("@/app/api/v1/health-goals/[id]/route");
    await DELETE(req, ctx);

    expect(coreProxyMock).toHaveBeenCalledWith(
      req,
      `/v1/health-goals/${goalId}`,
    );
  });
});
