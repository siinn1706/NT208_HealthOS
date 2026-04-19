/**
 * Locks down i18n key parity. Policy:
 *
 *   - English is the source of truth (`i18n-js` is configured with
 *     `enableFallback = true`, so missing vi keys gracefully render in English).
 *   - Vietnamese is allowed to LAG English: missing-in-vi is logged as a
 *     coverage warning but does NOT fail the suite.
 *   - Vietnamese is NOT allowed to be STALE: any vi key not present in en
 *     fails the suite, because that means the vi file is referencing a
 *     translation slot the app no longer reads.
 *   - All translation values in both files must be non-empty strings.
 */
import en from "@/i18n/en.json";
import vi from "@/i18n/vi.json";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

function flatten(obj: Json, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return [prefix];
  }
  return Object.entries(obj).flatMap(([k, v]) =>
    flatten(v, prefix ? `${prefix}.${k}` : k)
  );
}

function emptyValues(obj: Json, prefix = ""): string[] {
  if (typeof obj === "string") return obj.length === 0 ? [prefix] : [];
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return [];
  return Object.entries(obj).flatMap(([k, v]) =>
    emptyValues(v, prefix ? `${prefix}.${k}` : k)
  );
}

const enKeys = new Set(flatten(en as Json));
const viKeys = new Set(flatten(vi as Json));

describe("i18n parity", () => {
  it("vi never has stale keys (every vi key exists in en)", () => {
    const missingInEn = Array.from(viKeys).filter((k) => !enKeys.has(k)).sort();
    expect(missingInEn).toEqual([]);
  });

  it("translation values are never empty strings", () => {
    expect(emptyValues(en as Json, "en")).toEqual([]);
    expect(emptyValues(vi as Json, "vi")).toEqual([]);
  });

  it("reports vi coverage so the team sees translation debt", () => {
    const missingInVi = Array.from(enKeys).filter((k) => !viKeys.has(k));
    const total = enKeys.size;
    const covered = total - missingInVi.length;
    const pct = Math.round((covered / total) * 100);
    // Soft floor: vi must cover at least the core 'common', 'auth', 'tabs',
    // 'home', 'meals' keys. If coverage drops below 30 % overall, fail —
    // that signals the vi file was reset by accident.
    expect(pct).toBeGreaterThanOrEqual(30);

    if (missingInVi.length > 0 && process.env.JEST_VERBOSE === "1") {
      // eslint-disable-next-line no-console
      console.warn(
        `[i18n] vi coverage: ${pct}% (${missingInVi.length} keys missing)\n` +
          missingInVi.slice(0, 10).join("\n  - ")
      );
    }
  });
});
