/**
 * Invariant test: no BFF auth route exports `runtime = "edge"`.
 * Edge Runtime cannot use `node:redis`, `node:crypto`, or other Node APIs
 * required by the rate-limit primitive.
 */
import { describe, expect, it } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";

const AUTH_ROUTES_DIR = path.resolve(__dirname, "..");

function walkTs(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTs(full));
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.includes(".test.")) {
      results.push(full);
    }
  }
  return results;
}

describe("edge-runtime invariant", () => {
  it("no auth route file declares runtime = \"edge\"", () => {
    const files = walkTs(AUTH_ROUTES_DIR);
    expect(files.length).toBeGreaterThan(0);

    const violators: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      if (/export\s+const\s+runtime\s*=\s*["']edge["']/.test(content)) {
        violators.push(path.relative(AUTH_ROUTES_DIR, file));
      }
    }

    if (violators.length > 0) {
      expect.fail(
        `These auth route files declare runtime="edge" but rate-limit requires Node runtime:\n` +
          violators.map((f) => `  ${f}`).join("\n"),
      );
    }
  });
});
