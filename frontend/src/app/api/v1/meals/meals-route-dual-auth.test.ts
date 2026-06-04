import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const coreProxyMock = vi.hoisted(() => vi.fn());
const multipartProxyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/core-api-proxy", () => ({
  coreProxy: coreProxyMock,
}));

vi.mock("@/lib/bff/multipart-proxy", () => ({
  multipartProxy: multipartProxyMock,
}));

describe("POST /api/v1/meals — dual auth (cookie + bearer)", () => {
  beforeEach(() => {
    vi.resetModules();
    coreProxyMock.mockReset();
    multipartProxyMock.mockReset();
  });

  it("handles GET request with bearer token", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "GET",
      headers: { Authorization: "Bearer bearer-token-1" },
    });

    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    const { GET } = await import("@/app/api/v1/meals/route");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(coreProxyMock).toHaveBeenCalledWith(req, "/v1/meals");
  });

  it("handles POST JSON request with bearer token", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-token-2",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "pasta", calories: 450 }),
    });

    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "meal-1" }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/meals/route");
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(coreProxyMock).toHaveBeenCalled();
    const [, path, opts] = coreProxyMock.mock.calls[0];
    expect(path).toBe("/v1/meals");
    expect(opts?.multipart).toBeUndefined();
  });

  it("handles POST multipart request with bearer token", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-token-3",
        "Content-Type": "multipart/form-data; boundary=----boundary123",
      },
    });

    multipartProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "meal-2" }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/meals/route");
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(multipartProxyMock).toHaveBeenCalled();
    const [, path, opts] = multipartProxyMock.mock.calls[0];
    expect(path).toBe("/v1/meals");
    expect(opts?.bodySizeLimit).toBe(10 * 1024 * 1024);
  });

  it("forwards Idempotency-Key header for POST JSON", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-token-4",
        "Content-Type": "application/json",
        "Idempotency-Key": "key-unique-123",
      },
      body: JSON.stringify({ name: "salad" }),
    });

    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "meal-3" }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/meals/route");
    const response = await POST(req);

    expect(response.status).toBe(201);
    const [, , opts] = coreProxyMock.mock.calls[0];
    expect(opts?.extraHeaders).toEqual({ "Idempotency-Key": "key-unique-123" });
  });

  it("does not forward Idempotency-Key when not present", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-token-5",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "soup" }),
    });

    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "meal-4" }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/meals/route");
    await POST(req);

    const [, , opts] = coreProxyMock.mock.calls[0];
    expect(opts?.extraHeaders).toBeUndefined();
  });

  it("preserves Idempotency-Key for POST multipart", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-token-6",
        "Content-Type": "multipart/form-data; boundary=----xyz",
        "Idempotency-Key": "multipart-key-456",
      },
    });

    multipartProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "meal-5" }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/meals/route");
    const response = await POST(req);

    expect(response.status).toBe(201);
    const [, , opts] = multipartProxyMock.mock.calls[0];
    expect(opts?.extraHeaders).toEqual({ "Idempotency-Key": "multipart-key-456" });
  });

  it("routes to multipartProxy when Content-Type is multipart/form-data", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-token-7",
        "Content-Type": "multipart/form-data; boundary=----boundary456",
      },
    });

    multipartProxyMock.mockResolvedValue(
      new Response(JSON.stringify({}), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/meals/route");
    await POST(req);

    expect(multipartProxyMock).toHaveBeenCalled();
    expect(coreProxyMock).not.toHaveBeenCalled();
  });

  it("routes to coreProxy for non-multipart POST", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-token-8",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "fish" }),
    });

    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "meal-6" }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/meals/route");
    await POST(req);

    expect(coreProxyMock).toHaveBeenCalled();
    expect(multipartProxyMock).not.toHaveBeenCalled();
  });

  it("handles POST with no Content-Type header (assumes JSON)", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-token-9",
      },
      body: JSON.stringify({ name: "rice" }),
    });

    coreProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "meal-7" }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/meals/route");
    await POST(req);

    expect(coreProxyMock).toHaveBeenCalled();
    expect(multipartProxyMock).not.toHaveBeenCalled();
  });

  it("applies MEALS_UPLOAD_LIMIT (10 MiB) for multipart", async () => {
    const req = new NextRequest("http://localhost/api/v1/meals", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-token-10",
        "Content-Type": "multipart/form-data; boundary=----boundary789",
      },
    });

    multipartProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "meal-8" }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/meals/route");
    await POST(req);

    const [, , opts] = multipartProxyMock.mock.calls[0];
    expect(opts?.bodySizeLimit).toBe(10 * 1024 * 1024);
  });
});
