/**
 * AST test: OAuth init routes must export only GET.
 *
 * The Origin guard is a no-op for GET methods. If a future contributor
 * quietly adds a POST/PUT/PATCH/DELETE to an OAuth init route, this test
 * fails CI and forces an explicit guard-wiring decision.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const MUTATING_EXPORT_RE = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\s*[(<]/;

function resolveOAuthInitFiles(): string[] {
  const authDir = path.join(process.cwd(), "src/app/api/v1/auth/oauth");
  if (!fs.existsSync(authDir)) return [];

  const results: string[] = [];

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === "route.ts") {
        const rel = path.relative(authDir, full);
        const isProviderRoot = /^[^/\\]+[/\\]route\.ts$/.test(rel);
        const isLinkInit = /[/\\]link[/\\]init[/\\]route\.ts$/.test(rel);
        if (isProviderRoot || isLinkInit) results.push(full);
      }
    }
  }

  walk(authDir);
  return results;
}

describe("OAuth init routes — GET-only invariant", () => {
  const initFiles = resolveOAuthInitFiles();

  it("found at least one OAuth init route file", () => {
    expect(initFiles.length).toBeGreaterThan(0);
  });

  for (const file of initFiles) {
    it(`${path.relative(process.cwd(), file)} exports no mutating handler`, () => {
      const source = fs.readFileSync(file, "utf-8");
      const match = source.match(MUTATING_EXPORT_RE);
      expect(
        match,
        `OAuth init route exports ${match?.[1]} — wire assertSameOrigin before adding mutating handlers`,
      ).toBeNull();
    });
  }
});
