/**
 * AST test: every BFF route handler that exports a mutating method must import
 * either coreProxy/coreFetchStream/forwardToCore OR assertSameOrigin.
 *
 * Fails CI when a new direct-fetch handler is added without wiring the CSRF guard.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const MUTATING_RE = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\s*[(<]/;
const CORE_PROXY_IMPORT_RE = /from\s+["']@\/lib\/core-api-proxy["']/;
const GUARD_IMPORT_RE = /from\s+["']@\/lib\/bff-origin-guard["']/;

/** Path segments that are unconditionally exempt (GET-only or token-authenticated). */
const EXEMPT_SEGMENTS = [
  path.join("oauth", "github", "callback"),
  path.join("oauth", "google", "callback"),
  path.join("oauth", "github", "link", "callback"),
  path.join("oauth", "google", "link", "callback"),
  path.join("public"),
];

function isExempt(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return EXEMPT_SEGMENTS.some((seg) => normalized.includes(seg.replace(/\\/g, "/")));
}

function collectRouteFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  function walk(current: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === "route.ts") {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results;
}

describe("BFF mutating handlers — CSRF guard coverage", () => {
  const routesDir = path.join(process.cwd(), "src/app/api/v1");
  const routeFiles = collectRouteFiles(routesDir);

  it("found route files to scan", () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  const mutatingFiles = routeFiles.filter((f) => {
    if (isExempt(f)) return false;
    const source = fs.readFileSync(f, "utf-8");
    return MUTATING_RE.test(source);
  });

  it("found mutating route files", () => {
    expect(mutatingFiles.length).toBeGreaterThan(0);
  });

  for (const file of mutatingFiles) {
    it(`${path.relative(process.cwd(), file)} imports coreProxy or assertSameOrigin`, () => {
      const source = fs.readFileSync(file, "utf-8");
      const hasProxyImport = CORE_PROXY_IMPORT_RE.test(source);
      const hasGuardImport = GUARD_IMPORT_RE.test(source);
      expect(
        hasProxyImport || hasGuardImport,
        `Mutating handler missing CSRF guard: add assertSameOrigin from @/lib/bff-origin-guard, or route through coreProxy`,
      ).toBe(true);
    });
  }
});
