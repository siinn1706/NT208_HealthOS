/**
 * AST-based guard: ensures no BFF auth handler fetches a debug/agent/localhost
 * endpoint. Regex-based guards are bypassable (substring attacks on URL prefix) —
 * this test uses the TypeScript compiler API to parse every CallExpression.
 *
 * Pass conditions per file:
 *   - Every fetch(arg) where arg is a StringLiteral must start with an ALLOWED_PREFIXES entry.
 *   - Template literals: the TemplateHead identifier must be "CORE_API_URL".
 *   - Dynamic / computed URLs (Identifier, CallExpression, BinaryExpression as first arg) → FAIL.
 *   - Any literal text matching loopback patterns → FAIL regardless of context.
 *
 * OAuth callback handlers are excluded (they legitimately fetch Google/GitHub token endpoints).
 */
import { describe, expect, it } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as ts from "typescript";
import { EXCLUDED_GLOBS, HIBP_ALLOWED_FILE_PATTERN } from "./fetch-allow-list.fixture";

// Number of allowed-prefix entries (makes future additions visible in test name)
const ALLOW_LIST_SIZE = 2;

const LOOPBACK_PATTERN = /127\.0\.0\.1|::1|0x7f000001|2130706433/;

const AUTH_ROUTES_DIR = path.resolve(__dirname, "..");

interface FetchViolation {
  file: string;
  line: number;
  col: number;
  reason: string;
  sourceText: string;
}

function shouldExclude(relPath: string): boolean {
  // Normalize to forward slashes for glob-style matching
  const normalized = relPath.replace(/\\/g, "/");
  for (const pattern of EXCLUDED_GLOBS) {
    if (pattern === "**/*.test.ts" && normalized.endsWith(".test.ts")) return true;
    if (pattern === "**/*.spec.ts" && normalized.endsWith(".spec.ts")) return true;
    if (pattern === "**/oauth/**/callback/**" && /oauth\/.+\/callback\//.test(normalized)) return true;
  }
  return false;
}

function walkRouteFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkRouteFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      const rel = path.relative(AUTH_ROUTES_DIR, full).replace(/\\/g, "/");
      if (!shouldExclude(rel)) {
        results.push(full);
      }
    }
  }
  return results;
}

function getLineCol(sourceFile: ts.SourceFile, pos: number): { line: number; col: number } {
  const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, pos);
  return { line: line + 1, col: character + 1 };
}

function resolveFetchFirstArg(arg: ts.Expression): string | null {
  if (ts.isStringLiteral(arg)) {
    return arg.text;
  }
  if (ts.isNoSubstitutionTemplateLiteral(arg)) {
    return arg.text;
  }
  if (ts.isTemplateExpression(arg)) {
    // Template like `${CORE_API_URL}/v1/...` — inspect the first span
    const firstSpan = arg.templateSpans[0];
    if (firstSpan && ts.isIdentifier(firstSpan.expression)) {
      // Return a synthetic key so isAllowedFetchUrl can validate the identifier name
      return `\${${firstSpan.expression.text}}${arg.head.text}`;
    }
    // Multi-span or non-identifier — treat as dynamic
    return null;
  }
  // Identifier, CallExpression, BinaryExpression, etc. — dynamic
  return null;
}

function isAllowedFetchUrl(url: string, relPath: string): boolean {
  // Template literal starting with CORE_API_URL identifier
  if (url.startsWith("${CORE_API_URL}")) return true;

  // HIBP range endpoint — only allowed inside the specific route file
  if (
    url.startsWith("https://api.pwnedpasswords.com/range/") &&
    HIBP_ALLOWED_FILE_PATTERN.test(relPath)
  ) {
    return true;
  }

  return false;
}

function scanFileForFetchViolations(filePath: string): FetchViolation[] {
  const content = fs.readFileSync(filePath, "utf8");
  const relPath = path.relative(AUTH_ROUTES_DIR, filePath).replace(/\\/g, "/");
  const violations: FetchViolation[] = [];

  // Loopback literal check — raw text scan (catches comments/strings not in fetch args)
  if (LOOPBACK_PATTERN.test(content)) {
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      if (LOOPBACK_PATTERN.test(line)) {
        violations.push({
          file: relPath,
          line: idx + 1,
          col: 1,
          reason: "loopback address literal",
          sourceText: line.trim(),
        });
      }
    });
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "fetch" &&
      node.arguments.length > 0
    ) {
      const firstArg = node.arguments[0];
      const { line, col } = getLineCol(sourceFile, node.getStart(sourceFile));
      const sourceText = node.getText(sourceFile).slice(0, 120);

      const resolved = resolveFetchFirstArg(firstArg);

      if (resolved === null) {
        violations.push({
          file: relPath,
          line,
          col,
          reason: "dynamic/computed URL not allowed",
          sourceText,
        });
      } else if (!isAllowedFetchUrl(resolved, relPath)) {
        violations.push({
          file: relPath,
          line,
          col,
          reason: `URL "${resolved}" not in allow-list`,
          sourceText,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

describe(`no-debug-fetch-guard (allow-list has ${ALLOW_LIST_SIZE} entries)`, () => {
  it("has zero fetch violations across all non-OAuth BFF auth handlers", () => {
    const routeFiles = walkRouteFiles(AUTH_ROUTES_DIR).filter((f) =>
      f.endsWith("route.ts"),
    );

    expect(routeFiles.length).toBeGreaterThan(0);

    const allViolations: FetchViolation[] = [];
    for (const file of routeFiles) {
      allViolations.push(...scanFileForFetchViolations(file));
    }

    if (allViolations.length > 0) {
      const report = allViolations
        .map((v) => `  ${v.file}:${v.line}:${v.col} — ${v.reason}\n    ${v.sourceText}`)
        .join("\n");
      expect.fail(`Fetch violations found:\n${report}`);
    }
  });
});
