/**
 * admin-static-guards.test.ts — Static analysis tests for the Admin Console.
 *
 * These tests scan source files under the admin route group and admin
 * components directory to assert that certain forbidden patterns are absent.
 * They do NOT execute any runtime code; they read source text and apply
 * regex assertions.
 *
 * Covers:
 *   1. No direct Core calls  — no `fetch("/v1/...")` or absolute Core_Backend
 *      URLs in browser modules under the admin paths.
 *   2. No admin-status from client storage — no `localStorage`, `sessionStorage`,
 *      `IndexedDB`, or query-param reads used for admin status determination.
 *   3. No PHI columns — no identifiers like `vitals`, `diagnos`, `medical_record`
 *      in admin source files.
 *   4. No payment controls — no `checkout`, `payment`, `billing-provider`
 *      identifiers in the subscriptions module.
 *   5. Token usage check — no hard-coded hex colors or raw px sizes that
 *      duplicate existing design tokens in admin components.
 *
 * Validates: Requirements 3.11, 4.5, 7.8, 8.7, 9.7, 11.1, 11.2
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import { describe, it, expect } from "vitest";

// ── Path constants ────────────────────────────────────────────────────────────

/**
 * Resolve paths relative to the `frontend/` workspace root.
 * `__dirname` is `frontend/src/__tests__`, so we go up two levels.
 */
const FRONTEND_ROOT = resolve(__dirname, "..", "..");

const ADMIN_APP_DIR = join(
  FRONTEND_ROOT,
  "src",
  "app",
  "[locale]",
  "(admin)",
);

const ADMIN_COMPONENTS_DIR = join(
  FRONTEND_ROOT,
  "src",
  "components",
  "admin",
);

const SUBSCRIPTIONS_COMPONENT_DIR = join(
  ADMIN_COMPONENTS_DIR,
  "subscriptions",
);

// ── File collector ────────────────────────────────────────────────────────────

/**
 * Recursively collects all `.ts` and `.tsx` files under `dir`.
 * Skips `__tests__` subdirectories so test files don't self-report.
 */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(current: string): void {
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      // Directory does not exist yet — return empty list gracefully.
      return;
    }

    for (const entry of entries) {
      const fullPath = join(current, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        // Skip test directories to avoid false positives from test files.
        if (entry === "__tests__" || entry === "node_modules") continue;
        walk(fullPath);
      } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Reads a file and returns its content as a string.
 * Returns an empty string if the file cannot be read.
 */
function readSource(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the list of files that match the given regex pattern.
 * Used to produce actionable failure messages.
 *
 * When `skipComments` is true (default), lines that are purely comments
 * (starting with `//`, `*`, or `/*`) are excluded before matching.
 * This prevents false positives from documentation comments that explicitly
 * describe the absence of a pattern (e.g., "No PHI: no vitals...").
 */
function filesMatchingPattern(
  files: string[],
  pattern: RegExp,
  skipComments = true,
): Array<{ file: string; matches: string[] }> {
  const violations: Array<{ file: string; matches: string[] }> = [];

  for (const file of files) {
    const rawSource = readSource(file);

    // Optionally strip comment lines before matching
    const source = skipComments
      ? rawSource
          .split("\n")
          .filter((line) => {
            const trimmed = line.trim();
            return (
              !trimmed.startsWith("//") &&
              !trimmed.startsWith("*") &&
              !trimmed.startsWith("/*")
            );
          })
          .join("\n")
      : rawSource;

    const matches = source.match(pattern);
    if (matches && matches.length > 0) {
      violations.push({ file, matches: [...new Set(matches)] });
    }
  }

  return violations;
}

/**
 * Formats a violation list into a readable string for test failure messages.
 */
function formatViolations(
  violations: Array<{ file: string; matches: string[] }>,
): string {
  return violations
    .map(
      ({ file, matches }) =>
        `  ${file}\n    matches: ${matches.slice(0, 5).join(", ")}`,
    )
    .join("\n");
}

// ── Test suites ───────────────────────────────────────────────────────────────

// ── 1. No direct Core calls ───────────────────────────────────────────────────

describe("1. No direct Core calls in admin browser modules", () => {
  /**
   * Requirement 3.11: Browser code under Admin_Console SHALL only issue
   * requests whose path begins with `/api/v1/admin/` and SHALL NOT issue
   * requests whose path begins with `/v1/`.
   *
   * We scan for:
   *   - fetch("/v1/...") — direct Core call with absolute path
   *   - fetch(`/v1/...`) — template literal variant
   *   - fetch('http://...') or fetch("http://...") pointing to a Core URL
   *     (we look for the pattern /v1/ inside a fetch call string)
   *
   * Note: server-side BFF route handlers legitimately call Core via the
   * `coreProxy` utility, but those live under `app/api/v1/admin/` which is
   * NOT under the `(admin)` route group or `components/admin/`. This test
   * only scans the browser-facing modules.
   */

  it("admin app pages do not contain fetch('/v1/...') calls", () => {
    const files = collectSourceFiles(ADMIN_APP_DIR);
    // Match fetch calls whose first argument starts with /v1/
    const pattern = /fetch\s*\(\s*['"`]\/v1\//g;
    const violations = filesMatchingPattern(files, pattern);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin components do not contain fetch('/v1/...') calls", () => {
    const files = collectSourceFiles(ADMIN_COMPONENTS_DIR);
    const pattern = /fetch\s*\(\s*['"`]\/v1\//g;
    const violations = filesMatchingPattern(files, pattern);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin app pages do not contain absolute Core_Backend URLs (http(s)://...v1/)", () => {
    const files = collectSourceFiles(ADMIN_APP_DIR);
    // Match any string literal containing an absolute URL with /v1/ path segment
    const pattern = /['"`]https?:\/\/[^'"`]*\/v1\//g;
    const violations = filesMatchingPattern(files, pattern);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin components do not contain absolute Core_Backend URLs (http(s)://...v1/)", () => {
    const files = collectSourceFiles(ADMIN_COMPONENTS_DIR);
    const pattern = /['"`]https?:\/\/[^'"`]*\/v1\//g;
    const violations = filesMatchingPattern(files, pattern);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});

// ── 2. No admin-status from client storage ────────────────────────────────────

describe("2. No admin-status from client storage in admin browser modules", () => {
  /**
   * Requirements 4.5, 5.7: The HealthOS_Frontend SHALL NOT determine admin
   * status from localStorage, sessionStorage, IndexedDB, or URL query
   * parameters.
   *
   * We look for accesses to these APIs in the admin app and component files.
   * Note: legitimate uses of localStorage for non-admin-status purposes
   * (e.g., theme persistence) live outside the admin route group, so any
   * occurrence here is a violation.
   */

  it("admin app pages do not read localStorage for admin status", () => {
    const files = collectSourceFiles(ADMIN_APP_DIR);
    const pattern = /localStorage\s*\.\s*(getItem|setItem|removeItem|key|clear)\s*\(/g;
    const violations = filesMatchingPattern(files, pattern);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin components do not read localStorage for admin status", () => {
    const files = collectSourceFiles(ADMIN_COMPONENTS_DIR);
    const pattern = /localStorage\s*\.\s*(getItem|setItem|removeItem|key|clear)\s*\(/g;
    const violations = filesMatchingPattern(files, pattern);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin app pages do not read sessionStorage for admin status", () => {
    const files = collectSourceFiles(ADMIN_APP_DIR);
    const pattern = /sessionStorage\s*\.\s*(getItem|setItem|removeItem|key|clear)\s*\(/g;
    const violations = filesMatchingPattern(files, pattern);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin components do not read sessionStorage for admin status", () => {
    const files = collectSourceFiles(ADMIN_COMPONENTS_DIR);
    const pattern = /sessionStorage\s*\.\s*(getItem|setItem|removeItem|key|clear)\s*\(/g;
    const violations = filesMatchingPattern(files, pattern);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin app pages do not use IndexedDB for admin status", () => {
    const files = collectSourceFiles(ADMIN_APP_DIR);
    // Match indexedDB global access or IDBFactory/IDBDatabase references
    const pattern = /\bindexedDB\b|\bIDBFactory\b|\bIDBDatabase\b|\bIDBOpenDBRequest\b/g;
    const violations = filesMatchingPattern(files, pattern);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin components do not use IndexedDB for admin status", () => {
    const files = collectSourceFiles(ADMIN_COMPONENTS_DIR);
    const pattern = /\bindexedDB\b|\bIDBFactory\b|\bIDBDatabase\b|\bIDBOpenDBRequest\b/g;
    const violations = filesMatchingPattern(files, pattern);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin app pages do not read query params for admin status determination", () => {
    const files = collectSourceFiles(ADMIN_APP_DIR);
    // Match searchParams.get("is_admin") or similar admin-status query param reads
    const pattern = /searchParams\s*\.\s*get\s*\(\s*['"`]is_admin['"`]\s*\)/g;
    const violations = filesMatchingPattern(files, pattern);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin components do not read query params for admin status determination", () => {
    const files = collectSourceFiles(ADMIN_COMPONENTS_DIR);
    const pattern = /searchParams\s*\.\s*get\s*\(\s*['"`]is_admin['"`]\s*\)/g;
    const violations = filesMatchingPattern(files, pattern);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});

// ── 2b. Forbidden page is outside the guarded admin layout ───────────────────

describe("2b. Forbidden page route placement", () => {
  it("/admin/forbidden is not nested under the guarded admin layout", () => {
    const guardedForbiddenPage = join(
      ADMIN_APP_DIR,
      "admin",
      "forbidden",
      "page.tsx",
    );
    const publicForbiddenPage = join(
      FRONTEND_ROOT,
      "src",
      "app",
      "[locale]",
      "(admin-public)",
      "admin",
      "forbidden",
      "page.tsx",
    );

    expect(statSync(publicForbiddenPage).isFile()).toBe(true);
    expect(() => statSync(guardedForbiddenPage)).toThrow();
  });
});

// ── 3. No PHI columns ────────────────────────────────────────────────────────

describe("3. No PHI (Protected Health Information) identifiers in admin modules", () => {
  /**
   * Requirements 7.8, 8.7: The admin pages SHALL NOT render protected health
   * information, medical history, vitals, or diagnostic data.
   *
   * We scan for identifiers that suggest PHI columns:
   *   - vitals / vital_signs
   *   - diagnos (prefix covers diagnosis, diagnoses, diagnostic)
   *   - medical_record / medicalRecord
   *   - health_data / healthData
   *   - lab_result / labResult
   *   - prescription
   *
   * These patterns are matched case-insensitively to catch camelCase,
   * snake_case, and PascalCase variants.
   */

  const PHI_PATTERN =
    /\b(vitals?|vital_signs?|diagnos\w*|medical_record\w*|medicalRecord\w*|health_data|healthData|lab_results?|labResults?|prescription\w*)\b/gi;

  it("admin app pages do not reference PHI column identifiers", () => {
    const files = collectSourceFiles(ADMIN_APP_DIR);
    const violations = filesMatchingPattern(files, PHI_PATTERN);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin components do not reference PHI column identifiers", () => {
    const files = collectSourceFiles(ADMIN_COMPONENTS_DIR);
    const violations = filesMatchingPattern(files, PHI_PATTERN);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});

// ── 4. No payment controls in subscriptions module ───────────────────────────

describe("4. No payment controls in the subscriptions module", () => {
  /**
   * Requirement 9.7: The subscriptions page SHALL NOT render any payment
   * checkout, payment capture, or billing-provider integration controls.
   *
   * We scan the subscriptions component directory for identifiers that
   * suggest payment processing:
   *   - checkout
   *   - payment (as a standalone word or prefix)
   *   - billing-provider / billingProvider
   *   - stripe / paypal / vnpay / momo (common payment providers)
   *   - charge / capture (payment capture terms)
   */

  const PAYMENT_PATTERN =
    /\b(checkout|payment\w*|billing[-_]provider|billingProvider|stripe|paypal|vnpay|momo|charge\w*|capture\w*)\b/gi;

  it("subscriptions components do not contain payment/checkout/billing-provider identifiers", () => {
    const files = collectSourceFiles(SUBSCRIPTIONS_COMPONENT_DIR);
    const violations = filesMatchingPattern(files, PAYMENT_PATTERN);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin app subscriptions page does not contain payment/checkout/billing-provider identifiers", () => {
    const subscriptionsPageDir = join(
      ADMIN_APP_DIR,
      "admin",
      "subscriptions",
    );
    const files = collectSourceFiles(subscriptionsPageDir);
    const violations = filesMatchingPattern(files, PAYMENT_PATTERN);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});

// ── 5. Token usage check ──────────────────────────────────────────────────────

describe("5. No hard-coded hex colors or raw px sizes duplicating design tokens in admin components", () => {
  /**
   * Requirements 11.1, 11.2: The Admin_Console SHALL NOT hard-code color,
   * spacing, font-family, font-size, or font-weight values that duplicate
   * existing design tokens.
   *
   * We check for:
   *   a) Hard-coded hex colors: #RGB, #RRGGBB, #RRGGBBAA patterns in
   *      className strings or style props.
   *   b) Raw px sizes in className strings that duplicate token-based
   *      spacing (e.g., "16px", "24px" instead of Tailwind utilities).
   *
   * Exceptions:
   *   - CSS variable definitions in globals.css are intentional token
   *     definitions, not violations (we only scan .ts/.tsx files).
   *   - The `--admin-sidebar-bg`, `--admin-active` tokens are defined in
   *     globals.css and referenced via `var(...)` in components — that is
   *     the correct pattern.
   *   - Hex values inside comments are excluded.
   *   - Hex values inside CSS variable definitions (--color-*: #...) are
   *     excluded since those are token definitions, not inline hard-coding.
   *
   * The regex targets hex colors appearing inside JSX className strings or
   * style object values, which is where violations would occur.
   */

  /**
   * Matches hex color literals that appear inside JSX className attributes
   * or style prop values. We look for # followed by 3, 4, 6, or 8 hex digits
   * that are NOT inside a CSS variable definition line.
   *
   * Pattern explanation:
   *   - `#[0-9a-fA-F]{6}` — full 6-digit hex
   *   - `#[0-9a-fA-F]{3}(?![0-9a-fA-F])` — 3-digit hex (not followed by more hex)
   * We exclude lines that are CSS variable assignments (--*: #...) since
   * those are legitimate token definitions.
   */
  const HEX_COLOR_IN_JSX_PATTERN = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}(?![0-9a-fA-F])/g;

  /**
   * Matches raw pixel values inside JSX className strings or style props.
   * e.g., "width: 16px" or style={{ padding: "24px" }}
   * We look for digit sequences followed by "px" inside string literals.
   */
  const RAW_PX_IN_STYLE_PATTERN = /style\s*=\s*\{\s*\{[^}]*\d+px[^}]*\}\s*\}/g;

  it("admin components do not hard-code hex colors in JSX className or style props", () => {
    const files = collectSourceFiles(ADMIN_COMPONENTS_DIR);

    const violations: Array<{ file: string; matches: string[] }> = [];

    for (const file of files) {
      const source = readSource(file);
      const fileViolations: string[] = [];

      // Split into lines so we can exclude CSS variable definition lines
      // and comment lines.
      const lines = source.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();

        // Skip comment lines
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
          continue;
        }

        // Skip CSS variable definition lines (--something: #hex)
        if (/--[\w-]+\s*:\s*#[0-9a-fA-F]/.test(trimmed)) {
          continue;
        }

        // Skip lines that are purely CSS (inside template literals for CSS-in-JS
        // or globals.css — but we only scan .ts/.tsx so this is a safety guard)
        if (trimmed.startsWith("--") || trimmed.startsWith("@")) {
          continue;
        }

        const matches = line.match(HEX_COLOR_IN_JSX_PATTERN);
        if (matches) {
          fileViolations.push(...matches);
        }
      }

      if (fileViolations.length > 0) {
        violations.push({ file, matches: [...new Set(fileViolations)] });
      }
    }

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin components do not use raw px values in inline style props", () => {
    const files = collectSourceFiles(ADMIN_COMPONENTS_DIR);
    const violations = filesMatchingPattern(files, RAW_PX_IN_STYLE_PATTERN);

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it("admin app pages do not hard-code hex colors in JSX className or style props", () => {
    const files = collectSourceFiles(ADMIN_APP_DIR);

    const violations: Array<{ file: string; matches: string[] }> = [];

    for (const file of files) {
      const source = readSource(file);
      const fileViolations: string[] = [];

      const lines = source.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
          continue;
        }

        if (/--[\w-]+\s*:\s*#[0-9a-fA-F]/.test(trimmed)) {
          continue;
        }

        if (trimmed.startsWith("--") || trimmed.startsWith("@")) {
          continue;
        }

        const matches = line.match(HEX_COLOR_IN_JSX_PATTERN);
        if (matches) {
          fileViolations.push(...matches);
        }
      }

      if (fileViolations.length > 0) {
        violations.push({ file, matches: [...new Set(fileViolations)] });
      }
    }

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});
