import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Next.js routing policy", () => {
  const source = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");

  it("does not expose a production browser rewrite from /v1 to Core", () => {
    expect(source).not.toMatch(/source\s*:\s*["'`]\/v1\/:path\*/);
    expect(source).not.toMatch(/destination\s*:\s*["'`][^"'`]*\/v1\/:path\*/);
  });

  it("does not expose /ws as a Next.js rewrite to Core", () => {
    expect(source).not.toMatch(/source\s*:\s*["'`]\/ws(?:\/:path\*)?/);
  });
});
