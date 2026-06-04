import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

const cookiesMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

/** Construct a valid JWT with the given `sub` claim and a far-future expiry. */
function makeJwt(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ sub, exp: 9999999999 }),
  ).toString("base64url");
  return `${header}.${payload}.fake`;
}

function cookieStore(accessToken: string | null) {
  return {
    get: (name: string) =>
      name === SESSION_COOKIE_NAME && accessToken
        ? { name, value: accessToken }
        : undefined,
  };
}

describe("getBffAuthContext", () => {
  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
  });

  it("returns cookie context when cookie is present", async () => {
    const token = "opaque-session-cookie";
    cookiesMock.mockResolvedValue(cookieStore(token));

    const { getBffAuthContext } = await import("@/lib/bff-auth-context");
    const ctx = await getBffAuthContext(new NextRequest("http://localhost/test"));

    expect(ctx.kind).toBe("cookie");
    expect(ctx.token).toBe(token);
    expect(ctx.principal).toBeDefined();
    expect(ctx.principal).toMatch(/^tk:/);
  });

  it("returns bearer context when only Authorization header is present", async () => {
    cookiesMock.mockResolvedValue(cookieStore(null));
    const token = "bearer-token-123";
    const req = new NextRequest("http://localhost/test", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const { getBffAuthContext } = await import("@/lib/bff-auth-context");
    const ctx = await getBffAuthContext(req);

    expect(ctx.kind).toBe("bearer");
    expect(ctx.token).toBe(token);
    expect(ctx.principal).toBeDefined();
    expect(ctx.principal).toMatch(/^tk:/);
  });

  it("prioritizes cookie over bearer when both are present", async () => {
    const cookieToken = "cookie-wins";
    const bearerToken = "bearer-loses";
    cookiesMock.mockResolvedValue(cookieStore(cookieToken));
    const req = new NextRequest("http://localhost/test", {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });

    const { getBffAuthContext } = await import("@/lib/bff-auth-context");
    const ctx = await getBffAuthContext(req);

    expect(ctx.kind).toBe("cookie");
    expect(ctx.token).toBe(cookieToken);
  });

  it("returns no auth when neither cookie nor bearer is present", async () => {
    cookiesMock.mockResolvedValue(cookieStore(null));
    const req = new NextRequest("http://localhost/test", {
      headers: {},
    });

    const { getBffAuthContext } = await import("@/lib/bff-auth-context");
    const ctx = await getBffAuthContext(req);

    expect(ctx.kind).toBe("none");
    expect(ctx.token).toBeNull();
    expect(ctx.principal).toBeNull();
  });

  it("decodes JWT sub claim and returns user-bucketed principal", async () => {
    const sub = "user-123-uuid";
    const jwtToken = makeJwt(sub);
    cookiesMock.mockResolvedValue(cookieStore(jwtToken));

    const { getBffAuthContext } = await import("@/lib/bff-auth-context");
    const ctx = await getBffAuthContext(new NextRequest("http://localhost/test"));

    expect(ctx.principal).toBe(`user:${sub}`);
  });

  it("falls back to opaque token hash when JWT has no sub claim", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ exp: 9999999999 })).toString("base64url");
    const token = `${header}.${payload}.fake`;
    const expectedHash = createHash("sha256").update(token).digest("hex").slice(0, 8);

    cookiesMock.mockResolvedValue(cookieStore(token));

    const { getBffAuthContext } = await import("@/lib/bff-auth-context");
    const ctx = await getBffAuthContext(new NextRequest("http://localhost/test"));

    expect(ctx.principal).toBe(`tk:${expectedHash}`);
  });

  it("falls back to opaque token hash when token is not a valid JWT", async () => {
    const opaqueToken = "not-a-jwt-at-all";
    const expectedHash = createHash("sha256")
      .update(opaqueToken)
      .digest("hex")
      .slice(0, 8);

    cookiesMock.mockResolvedValue(cookieStore(opaqueToken));

    const { getBffAuthContext } = await import("@/lib/bff-auth-context");
    const ctx = await getBffAuthContext(new NextRequest("http://localhost/test"));

    expect(ctx.principal).toBe(`tk:${expectedHash}`);
  });

  it("gives the same principal to the same JWT sub via cookie and bearer", async () => {
    const sub = "shared-user-456";
    const jwtToken = makeJwt(sub);

    // Cookie version
    cookiesMock.mockResolvedValue(cookieStore(jwtToken));
    const { getBffAuthContext: getCookieCtx } = await import("@/lib/bff-auth-context");
    const cookieCtx = await getCookieCtx(new NextRequest("http://localhost/test"));

    vi.resetModules();
    const bearerReq = new NextRequest("http://localhost/test", {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    cookiesMock.mockResolvedValue(cookieStore(null));
    const { getBffAuthContext: getBearerCtx } = await import("@/lib/bff-auth-context");
    const bearerCtx = await getBearerCtx(bearerReq);

    expect(cookieCtx.principal).toBe(`user:${sub}`);
    expect(bearerCtx.principal).toBe(`user:${sub}`);
    expect(cookieCtx.principal).toBe(bearerCtx.principal);
  });

  it("strips 'Bearer ' prefix with extra whitespace", async () => {
    cookiesMock.mockResolvedValue(cookieStore(null));
    const token = "bare-token";
    const req = new NextRequest("http://localhost/test", {
      headers: { Authorization: `Bearer   ${token}  ` },
    });

    const { getBffAuthContext } = await import("@/lib/bff-auth-context");
    const ctx = await getBffAuthContext(req);

    expect(ctx.kind).toBe("bearer");
    expect(ctx.token).toBe(token);
  });

  it("returns null bearer when Authorization is malformed", async () => {
    cookiesMock.mockResolvedValue(cookieStore(null));
    const req = new NextRequest("http://localhost/test", {
      headers: { Authorization: "NotBearer token" },
    });

    const { getBffAuthContext } = await import("@/lib/bff-auth-context");
    const ctx = await getBffAuthContext(req);

    expect(ctx.kind).toBe("none");
    expect(ctx.token).toBeNull();
  });

  it("handles Bearer with no token gracefully", async () => {
    cookiesMock.mockResolvedValue(cookieStore(null));
    const req = new NextRequest("http://localhost/test", {
      headers: { Authorization: "Bearer" },
    });

    const { getBffAuthContext } = await import("@/lib/bff-auth-context");
    const ctx = await getBffAuthContext(req);

    expect(ctx.kind).toBe("none");
    expect(ctx.token).toBeNull();
  });
});
