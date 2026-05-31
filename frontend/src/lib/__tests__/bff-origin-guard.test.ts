import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Reset module env between tests that toggle NODE_ENV or env vars.
function makeReq(
  method: string,
  path: string,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(`http://app.example${path}`, { method, headers });
}

describe("parseAllowedOrigins", () => {
  it("parses comma-separated URLs into host strings", async () => {
    const { parseAllowedOrigins } = await import("@/lib/bff-origin-guard");
    const result = parseAllowedOrigins(
      "https://app.example.com,https://staging.example.com:8443",
      true,
    );
    expect(result).toEqual(["app.example.com", "staging.example.com:8443"]);
  });

  it("ignores malformed entries silently", async () => {
    const { parseAllowedOrigins } = await import("@/lib/bff-origin-guard");
    const result = parseAllowedOrigins("not-a-url,https://valid.example.com", true);
    expect(result).toEqual(["valid.example.com"]);
  });
});

describe("assertFrontendEnvConfig", () => {
  beforeEach(() => vi.resetModules());

  afterEach(() => {
    delete process.env.APP_ENV;
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.BFF_TRUSTED_ORIGINS;
    delete process.env.BFF_CSRF_GUARD_MODE;
    delete process.env.DEV_BYPASS_ENABLED;
    delete process.env.DEV_BYPASS_CREDENTIALS;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  });

  it("fails protected env when trusted origins are empty", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    process.env.BFF_TRUSTED_ORIGINS = "";
    const { assertFrontendEnvConfig } = await import("@/lib/env");

    expect(() => assertFrontendEnvConfig()).toThrow(/BFF_TRUSTED_ORIGINS/);
  });

  it("fails protected env when trusted origins are malformed", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "staging";
    process.env.BFF_TRUSTED_ORIGINS = "not-a-url";
    const { assertFrontendEnvConfig } = await import("@/lib/env");

    expect(() => assertFrontendEnvConfig()).toThrow(/valid absolute BFF_TRUSTED_ORIGINS/);
  });

  it("rejects dev bypass config in protected envs", async () => {
    process.env.APP_ENV = "staging";
    process.env.BFF_TRUSTED_ORIGINS = "https://staging.healthos.example";
    process.env.DEV_BYPASS_ENABLED = "true";
    process.env.DEV_BYPASS_CREDENTIALS = "admin:admin";
    const { assertFrontendEnvConfig } = await import("@/lib/env");

    expect(() => assertFrontendEnvConfig()).toThrow(/DEV_BYPASS/);
  });

  it("rejects CSRF dry-run config in protected envs", async () => {
    process.env.APP_ENV = "staging";
    process.env.BFF_TRUSTED_ORIGINS = "https://staging.healthos.example";
    process.env.BFF_CSRF_GUARD_MODE = "dry-run";
    const { assertFrontendEnvConfig } = await import("@/lib/env");

    expect(() => assertFrontendEnvConfig()).toThrow(/BFF_CSRF_GUARD_MODE/);
  });
});

describe("originMatches", () => {
  it("returns true for an explicit allow-list hit in production", async () => {
    const { originMatches } = await import("@/lib/bff-origin-guard");
    expect(originMatches("app.example.com", ["app.example.com"], "app.example.com", true)).toBe(true);
  });

  it("rejects when origin not in prod allow-list even if it matches Host", async () => {
    const { originMatches } = await import("@/lib/bff-origin-guard");
    // Same-Host fallback is DISABLED in production.
    expect(originMatches("app.example.com", [], "app.example.com", true)).toBe(false);
  });

  it("allows localhost in dev even without explicit allow-list entry", async () => {
    const { originMatches } = await import("@/lib/bff-origin-guard");
    expect(originMatches("localhost:3000", [], "localhost:3000", false)).toBe(true);
  });

  it("allows 127.0.0.1 in dev", async () => {
    const { originMatches } = await import("@/lib/bff-origin-guard");
    expect(originMatches("127.0.0.1:3000", [], "127.0.0.1:3000", false)).toBe(true);
  });

  it("allows same-Host fallback in dev when no explicit entry", async () => {
    const { originMatches } = await import("@/lib/bff-origin-guard");
    expect(originMatches("dev.internal:4000", [], "dev.internal:4000", false)).toBe(true);
  });

  it("rejects same-Host fallback in production", async () => {
    const { originMatches } = await import("@/lib/bff-origin-guard");
    expect(originMatches("dev.internal:4000", [], "dev.internal:4000", true)).toBe(false);
  });
});

describe("assertSameOrigin — safe methods", () => {
  beforeEach(() => vi.resetModules());

  it.each(["GET", "HEAD", "OPTIONS"])("returns null for %s", async (method) => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    const { assertSameOrigin } = await import("@/lib/bff-origin-guard");
    const req = makeReq(method, "/api/v1/users/me");
    expect(assertSameOrigin(req)).toBeNull();
  });
});

describe("assertSameOrigin — exempt path prefixes", () => {
  beforeEach(() => vi.resetModules());

  it("returns null for /api/v1/public/** even with mismatched Origin", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    process.env.BFF_TRUSTED_ORIGINS = "https://prod.example.com";
    const { assertSameOrigin } = await import("@/lib/bff-origin-guard");
    const req = makeReq("POST", "/api/v1/public/emergency/abc/scan", {
      Origin: "https://evil.example.com",
    });
    expect(assertSameOrigin(req)).toBeNull();
    delete process.env.BFF_TRUSTED_ORIGINS;
  });
});

describe("assertSameOrigin — production enforcement", () => {
  beforeEach(() => {
    vi.resetModules();
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    process.env.BFF_CSRF_GUARD_MODE = "enforce";
  });

  afterEach(() => {
    delete process.env.BFF_TRUSTED_ORIGINS;
    delete process.env.BFF_CSRF_GUARD_MODE;
    // Restore to test environment
    (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  });

  it("rejects when Origin not in allow-list", async () => {
    process.env.BFF_TRUSTED_ORIGINS = "https://app.healthos.example";
    const { assertSameOrigin } = await import("@/lib/bff-origin-guard");
    const req = makeReq("POST", "/api/v1/auth", { Origin: "https://evil.attacker.com" });
    const result = assertSameOrigin(req);
    expect(result).not.toBeNull();
    const json = await result!.json();
    expect(json).toEqual({ error: { code: "CSRF_ORIGIN_REJECTED", message: "Invalid request origin." } });
    expect(result!.status).toBe(403);
  });

  it("rejects when Origin matches Host but not in allow-list (Host-spoof guard)", async () => {
    process.env.BFF_TRUSTED_ORIGINS = "";
    const { assertSameOrigin } = await import("@/lib/bff-origin-guard");
    const req = makeReq("POST", "/api/v1/auth", {
      Origin: "http://app.example",
      Host: "app.example",
    });
    const result = assertSameOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("passes when Origin is in allow-list", async () => {
    process.env.BFF_TRUSTED_ORIGINS = "https://app.example";
    const { assertSameOrigin } = await import("@/lib/bff-origin-guard");
    const req = makeReq("POST", "/api/v1/auth", { Origin: "https://app.example" });
    expect(assertSameOrigin(req)).toBeNull();
  });

  it("passes using Referer when Origin absent", async () => {
    process.env.BFF_TRUSTED_ORIGINS = "https://app.example";
    const { assertSameOrigin } = await import("@/lib/bff-origin-guard");
    const req = makeReq("POST", "/api/v1/auth", {
      Referer: "https://app.example/login",
    });
    expect(assertSameOrigin(req)).toBeNull();
  });

  it("rejects localhost in production when not in allow-list", async () => {
    process.env.BFF_TRUSTED_ORIGINS = "https://app.example";
    const { assertSameOrigin } = await import("@/lib/bff-origin-guard");
    const req = makeReq("POST", "/api/v1/auth", { Origin: "http://localhost:3000" });
    const result = assertSameOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("rejects in protected env even if CSRF dry-run is configured", async () => {
    process.env.BFF_TRUSTED_ORIGINS = "https://app.example";
    process.env.BFF_CSRF_GUARD_MODE = "dry-run";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { assertSameOrigin } = await import("@/lib/bff-origin-guard");
    const req = makeReq("POST", "/api/v1/auth", { Origin: "https://evil.attacker.com" });
    const result = assertSameOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    expect(warnSpy).toHaveBeenCalledOnce();
    const logArg = JSON.parse(warnSpy.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(logArg.event).toBe("csrf.guard.rejected");
    warnSpy.mockRestore();
  });
});

describe("assertSameOrigin — development", () => {
  beforeEach(() => {
    vi.resetModules();
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    delete process.env.BFF_TRUSTED_ORIGINS;
    process.env.BFF_CSRF_GUARD_MODE = "enforce";
  });

  afterEach(() => {
    delete process.env.BFF_CSRF_GUARD_MODE;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  });

  it("passes for localhost origin without explicit allow-list", async () => {
    const { assertSameOrigin } = await import("@/lib/bff-origin-guard");
    const req = makeReq("POST", "/api/v1/auth", { Origin: "http://localhost:3000" });
    expect(assertSameOrigin(req)).toBeNull();
  });
});

describe("assertSameOrigin — dry-run mode", () => {
  beforeEach(() => {
    vi.resetModules();
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    process.env.BFF_TRUSTED_ORIGINS = "https://dev.healthos.example";
    process.env.BFF_CSRF_GUARD_MODE = "dry-run";
  });

  afterEach(() => {
    delete process.env.BFF_TRUSTED_ORIGINS;
    delete process.env.BFF_CSRF_GUARD_MODE;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  });

  it("returns null on mismatch (logs warn, does not block)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { assertSameOrigin } = await import("@/lib/bff-origin-guard");
    const req = makeReq("POST", "/api/v1/auth", { Origin: "https://evil.attacker.com" });
    expect(assertSameOrigin(req)).toBeNull();
    expect(warnSpy).toHaveBeenCalledOnce();
    const logArg = JSON.parse(warnSpy.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(logArg.event).toBe("csrf.guard.dry_run_pass");
    warnSpy.mockRestore();
  });
});

describe("assertSameOrigin — token redaction in rejection log", () => {
  beforeEach(() => {
    vi.resetModules();
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    process.env.BFF_TRUSTED_ORIGINS = "https://other.example.com";
    process.env.BFF_CSRF_GUARD_MODE = "enforce";
  });

  afterEach(() => {
    delete process.env.BFF_TRUSTED_ORIGINS;
    delete process.env.BFF_CSRF_GUARD_MODE;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  });

  it("logs only host:port — no path, no query, no fragment", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { assertSameOrigin } = await import("@/lib/bff-origin-guard");
    const req = makeReq("POST", "/api/v1/auth", {
      Referer: "https://app.example/reset?token=ABC#frag",
    });
    assertSameOrigin(req);
    expect(warnSpy).toHaveBeenCalledOnce();
    const logArg = JSON.parse(warnSpy.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(logArg.origin_host).toBe("app.example");
    // Must NOT contain path, query string, or fragment.
    expect(String(logArg.origin_host)).not.toContain("/reset");
    expect(String(logArg.origin_host)).not.toContain("token=ABC");
    expect(String(logArg.origin_host)).not.toContain("frag");
    warnSpy.mockRestore();
  });
});
