import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/v1/auth/verify-otp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "localhost",
      origin: "http://localhost",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify(body),
  });
}

describe("auth verify-otp route", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.CORE_API_URL = "http://core.example";
    process.env.TRUST_PROXY = "1";
    process.env.VITEST = "true";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.TRUST_PROXY;
  });

  it("proxies delete_account verified marker responses without requiring auth tokens", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          data: {
            email: "delete@example.com",
            next_step: "delete_account",
          },
        },
        200,
      ),
    );

    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        email: "delete@example.com",
        purpose: "delete_account",
        code: "123456",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.next_step).toBe("delete_account");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://core.example/v1/auth/verify-otp",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
});
