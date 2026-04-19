/**
 * Lock-in test for theming consistency.
 *
 * Scans every screen + component for the small set of "you almost
 * always meant the theme token" hard-coded values that the
 * theming-consistency audit (CHANGELOG 0.1.0) cleaned up. A future
 * commit that re-introduces, say, `borderRadius: 999` instead of
 * `radius.pill`, fails CI here BEFORE it compounds across more
 * screens.
 *
 * The patterns are deliberately conservative — we only flag values
 * that match an EXISTING token byte-for-byte and have no plausible
 * non-themed reason to be hard-coded. Anything ambiguous (e.g. raw
 * `2` for half-pixel chrome) is left alone.
 */
import * as fs from "fs";
import * as path from "path";
import { spacing, radius, typography } from "@/theme/tokens";

const ROOT = path.join(__dirname, "..", "..");
const SCAN_DIRS = ["src", "app"];

// Files we deliberately exempt:
//   - tokens.ts itself (the source of truth)
//   - the theme module (defines the palette)
//   - the accent picker (the colors ARE the data)
const EXEMPTIONS = new Set([
  path.join("src", "theme", "tokens.ts"),
  path.join("src", "theme", "colors.ts"),
  path.join("src", "theme", "index.tsx"),
  path.join("app", "(tabs)", "more", "preferences.tsx"),
]);

/**
 * Walk a directory recursively and return every .ts/.tsx file
 * relative to ROOT.
 */
function walk(dir: string, out: string[] = []): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(rel, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => walk(d)).filter(
  (f) => !EXEMPTIONS.has(f)
);

interface Finding {
  file: string;
  line: number;
  match: string;
  shouldUse: string;
}

function scanFile(rel: string, regex: RegExp, shouldUse: string): Finding[] {
  const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const findings: Finding[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (regex.test(line)) {
      findings.push({ file: rel, line: i + 1, match: line.trim(), shouldUse });
    }
  }
  return findings;
}

function scanAll(regex: RegExp, shouldUse: string): Finding[] {
  return files.flatMap((f) => scanFile(f, regex, shouldUse));
}

function format(findings: Finding[]): string {
  return findings
    .map((f) => `  ${f.file}:${f.line}  →  use ${f.shouldUse}\n    ${f.match}`)
    .join("\n");
}

describe("theme-token consistency", () => {
  it("no `borderRadius: 999` (use radius.pill)", () => {
    const findings = scanAll(/borderRadius:\s*999\b/, "radius.pill");
    expect(findings.length === 0 ? null : format(findings)).toBeNull();
  });

  it("no `borderRadius: 12` (use radius.md, our 12 token-equivalent)", () => {
    // 12 is between radius.md (10) and radius.lg (16). Pick md
    // unanimously across the app rather than scattering both.
    const findings = scanAll(/borderRadius:\s*12\b/, "radius.md");
    expect(findings.length === 0 ? null : format(findings)).toBeNull();
  });

  it("no `borderRadius: 4` outside connection-status dots (use radius.xs)", () => {
    const findings = scanAll(/borderRadius:\s*4\b/, "radius.xs");
    expect(findings.length === 0 ? null : format(findings)).toBeNull();
  });

  it("no raw numeric `fontWeight: \"600\"` / \"700\" (use fontWeights.semibold / .bold)", () => {
    // tabBarLabelStyle in app/(tabs)/_layout.tsx uses "600" because
    // expo-router doesn't accept a Theme dependency at config time —
    // exempt that single line via path check.
    const findings = scanAll(
      /fontWeight:\s*["'](?:400|500|600|700|800|900)["']/,
      "fontWeights.regular/medium/semibold/bold"
    ).filter(
      (f) =>
        !f.file.endsWith(path.join("(tabs)", "_layout.tsx")) ||
        !/tabBarLabelStyle/.test(f.match)
    );
    expect(findings.length === 0 ? null : format(findings)).toBeNull();
  });

  it("no raw `fontSize: 10` or `fontSize: 11` (use typography['2xs'])", () => {
    // 11 in (tabs)/_layout.tsx is the platform-recommended Material
    // tab-label size; exempted there.
    const findings = scanAll(
      /fontSize:\s*1[01]\b/,
      "typography['2xs']"
    ).filter(
      (f) =>
        !f.file.endsWith(path.join("(tabs)", "_layout.tsx")) ||
        !/tabBarLabelStyle/.test(f.match)
    );
    expect(findings.length === 0 ? null : format(findings)).toBeNull();
  });

  it("no raw `padding: 16` (use spacing.base)", () => {
    const findings = scanAll(
      /(?:^|\W)padding:\s*16\b/,
      "spacing.base"
    );
    expect(findings.length === 0 ? null : format(findings)).toBeNull();
  });

  it("token table itself is internally consistent", () => {
    // Catches typos like spacing.base !== 16 that would silently shift
    // every screen if someone "tunes" the scale without auditing.
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(12);
    expect(spacing.base).toBe(16);
    expect(radius.xs).toBe(4);
    expect(radius.md).toBe(10);
    expect(radius.pill).toBe(999);
    expect(typography["2xs"].fontSize).toBe(11);
    expect(typography.xs.fontSize).toBe(12);
    expect(typography.base.fontSize).toBe(16);
  });
});
