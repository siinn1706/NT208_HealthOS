import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const multipartProxyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/bff/multipart-proxy", () => ({
  multipartProxy: multipartProxyMock,
}));

describe("POST /api/v1/users/me/avatar — dual auth (cookie + bearer)", () => {
  beforeEach(() => {
    vi.resetModules();
    multipartProxyMock.mockReset();
  });

  it("handles POST multipart request with bearer token", async () => {
    const req = new NextRequest("http://localhost/api/v1/users/me/avatar", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-avatar-1",
        "Content-Type": "multipart/form-data; boundary=----avatarboundary123",
      },
    });

    multipartProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ avatar_url: "http://..." }), { status: 200 }),
    );

    const { POST } = await import("@/app/api/v1/users/me/avatar/route");
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(multipartProxyMock).toHaveBeenCalled();
  });

  it("applies 5 MiB body size limit for avatar upload", async () => {
    const req = new NextRequest("http://localhost/api/v1/users/me/avatar", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-avatar-2",
        "Content-Type": "multipart/form-data; boundary=----avatarboundary456",
      },
    });

    multipartProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ avatar_url: "http://..." }), { status: 200 }),
    );

    const { POST } = await import("@/app/api/v1/users/me/avatar/route");
    await POST(req);

    expect(multipartProxyMock).toHaveBeenCalledWith(
      req,
      "/v1/users/me/avatar",
      expect.objectContaining({
        bodySizeLimit: 5 * 1024 * 1024,
      }),
    );
  });

  it("passes correct core path to multipartProxy", async () => {
    const req = new NextRequest("http://localhost/api/v1/users/me/avatar", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-avatar-3",
        "Content-Type": "multipart/form-data; boundary=----boundary789",
      },
    });

    multipartProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ avatar_url: "http://..." }), { status: 200 }),
    );

    const { POST } = await import("@/app/api/v1/users/me/avatar/route");
    await POST(req);

    const [, corePath] = multipartProxyMock.mock.calls[0];
    expect(corePath).toBe("/v1/users/me/avatar");
  });

  it("handles 413 response from multipartProxy for oversized image", async () => {
    const req = new NextRequest("http://localhost/api/v1/users/me/avatar", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-avatar-4",
        "Content-Type": "multipart/form-data; boundary=----boundary999",
      },
    });

    multipartProxyMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "PAYLOAD_TOO_LARGE", message: "File too large" } }),
        { status: 413 },
      ),
    );

    const { POST } = await import("@/app/api/v1/users/me/avatar/route");
    const response = await POST(req);

    expect(response.status).toBe(413);
  });

  it("handles 201 success response from multipartProxy", async () => {
    const req = new NextRequest("http://localhost/api/v1/users/me/avatar", {
      method: "POST",
      headers: {
        Authorization: "Bearer bearer-avatar-5",
        "Content-Type": "multipart/form-data; boundary=----createdbound",
      },
    });

    multipartProxyMock.mockResolvedValue(
      new Response(JSON.stringify({ avatar_url: "http://example.com/avatar.jpg" }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/v1/users/me/avatar/route");
    const response = await POST(req);

    expect(response.status).toBe(201);
  });
});
