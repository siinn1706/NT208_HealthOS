/**
 * i18n-parity.test.ts
 *
 * Verifies that vi.json has exactly the same key tree as en.json.
 * Fails fast with the first missing or extra key path so diffs are readable.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const MESSAGES_DIR = join(process.cwd(), "messages");

function collectKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  const result: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      result.push(...collectKeys(v, path));
    } else {
      result.push(path);
    }
  }
  return result;
}

describe("i18n parity: vi.json matches en.json key tree", () => {
  const en = JSON.parse(readFileSync(join(MESSAGES_DIR, "en.json"), "utf-8")) as Record<string, unknown>;
  const vi = JSON.parse(readFileSync(join(MESSAGES_DIR, "vi.json"), "utf-8")) as Record<string, unknown>;

  const enKeys = new Set(collectKeys(en));
  const viKeys = new Set(collectKeys(vi));

  it("vi.json has no keys missing from en.json", () => {
    const missing = [...enKeys].filter((k) => !viKeys.has(k));
    expect(missing, `Keys in en.json missing from vi.json:\n${missing.join("\n")}`).toHaveLength(0);
  });

  it("vi.json has no extra keys not present in en.json", () => {
    const extra = [...viKeys].filter((k) => !enKeys.has(k));
    expect(extra, `Keys in vi.json not in en.json:\n${extra.join("\n")}`).toHaveLength(0);
  });

  it("both files are valid JSON (parse succeeds)", () => {
    expect(enKeys.size).toBeGreaterThan(0);
    expect(viKeys.size).toBeGreaterThan(0);
  });
});
