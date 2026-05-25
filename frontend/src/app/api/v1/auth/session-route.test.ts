import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  META_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/bff-auth-cookie";
import { __resetStoreForTests } from "@/lib/bff-rate-limit";

const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/v1/auth/session route", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    // vi.resetModules() is the actual isolation mechanism here since routes are
    // dynamically imported per-test. __resetStoreForTests is called defensively
    // to clear any store state from the static import context.
    __resetStoreForTests();
    cookiesMock.mockReset();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.CORE_API_URL = "http://core.example";
  });

  it("stores access and refresh cookies on successful password login", async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined });
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          data: {
            access_token: "access-new",
            refresh_token: "refresh-new",
            user_id: "u-1",
            email: "user@example.com",
            username: "user",
            display_name: "User",
            avatar_url: null,
            onboarding_status: "completed",
            roles: ["admin"],
            permissions: ["admin.access"],
          },
        },
        200,
      ),
    );

    const { POST } = await import("@/app/api/v1/auth/route");
    const request = new NextRequest("http://localhost/api/v1/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "http://localhost" },
      body: JSON.stringify({ identifier: "user@example.com", password: "pw" }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      data: {
        user_id: "u-1",
        email: "user@example.com",
        username: "user",
        display_name: "User",
        avatar_url: null,
        onboarding_status: "completed",
        roles: ["admin"],
        permissions: ["admin.access"],
      },
    });
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe("access-new");
    expect(response.cookies.get(REFRESH_COOKIE_NAME)?.value).toBe("refresh-new");
    const meta = JSON.parse(response.cookies.get(META_COOKIE_NAME)?.value ?? "{}");
    expect(meta).toEqual({
      onboarding_status: "completed",
      is_admin: true,
    });
  });

  it("sends refresh token to Core logout and clears auth cookies", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) => {
        if (name === SESSION_COOKIE_NAME) return { name, value: "access-old" };
        if (name === REFRESH_COOKIE_NAME) return { name, value: "refresh-old" };
        return undefined;
      },
    });
    fetchMock.mockResolvedValue(jsonResponse({ data: { success: true } }, 200));

    const { DELETE } = await import("@/app/api/v1/auth/route");
    const deleteReq = new NextRequest("http://localhost/api/v1/auth/session", {
      method: "DELETE",
      headers: { "Origin": "http://localhost" },
    });
    const response = await DELETE(deleteReq);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://core.example/v1/auth/logout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refresh_token: "refresh-old" }),
      }),
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(requestInit.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer access-old",
        "Content-Type": "application/json",
      }),
    );
    expect(response.cookies.getAll().map((cookie) => cookie.name)).toEqual(
      expect.arrayContaining([
        SESSION_COOKIE_NAME,
        META_COOKIE_NAME,
        REFRESH_COOKIE_NAME,
      ]),
    );
  });
});
