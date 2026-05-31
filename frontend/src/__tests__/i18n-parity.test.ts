/**
 * i18n-parity.test.ts
 *
 * Verifies that vi.json has exactly the same key tree as en.json.
 * Fails fast with the first missing or extra key path so diffs are readable.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const MESSAGES_DIR = join(process.cwd(), "messages");
const AUTH_COMPONENTS_DIR = join(process.cwd(), "src/components/shared/auth");

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

function readPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, part) => {
    if (typeof value !== "object" || value === null) return undefined;
    return (value as Record<string, unknown>)[part];
  }, obj);
}

function collectTsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [fullPath] : [];
  });
}

function collectAuthErrorTranslatorKeys(): string[] {
  const keys = new Set<string>();
  const keyPattern = /tErrors\("([^"]+)"\)/g;

  for (const file of collectTsxFiles(AUTH_COMPONENTS_DIR)) {
    const source = readFileSync(file, "utf-8");
    for (const match of source.matchAll(keyPattern)) {
      keys.add(`errors.${match[1]}`);
    }
  }

  return [...keys].sort();
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

  it("auth form error translator keys exist in both locales", () => {
    const keys = collectAuthErrorTranslatorKeys();
    const missing = keys.filter(
      (key) => typeof readPath(en, key) !== "string" || typeof readPath(vi, key) !== "string",
    );

    expect(missing, `Missing auth error translation keys:\n${missing.join("\n")}`).toHaveLength(0);
  });
});
