#!/usr/bin/env node
/**
 * Detects forbidden patterns that indicate mobile client code is reaching Core BE
 * directly instead of going through the BFF or public gateway.
 *
 * Exit 0 = clean.  Exit 1 = at least one violation (printed to stderr).
 *
 * Per-line opt-out: add `// no-direct-core-ok: <reason>` on the offending line
 * or the line above it (mirrors `# idor-ok:` from backend/scripts/check_idor.py).
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';
import { posix } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = resolve(__dirname, '..');
const SRC_DIR = join(MOBILE_ROOT, 'src');

// ── Forbidden patterns ────────────────────────────────────────────────────────

const FORBIDDEN_PATTERNS = [
  { name: 'localhost:8000', regex: /\blocalhost:8000\b/ },
  { name: '10.0.2.2:8000', regex: /\b10\.0\.2\.2:8000\b/ },
  { name: 'NEXT_PUBLIC_CORE_WS_URL', regex: /\bNEXT_PUBLIC_CORE_WS_URL\b/ },
  { name: 'EXPO_PUBLIC_CORE_WS_URL', regex: /\bEXPO_PUBLIC_CORE_WS_URL\b/ },
  { name: 'EXPO_PUBLIC_CORE_API_URL', regex: /\bEXPO_PUBLIC_CORE_API_URL\b/ },
  { name: "fetch('/v1/", regex: /fetch\s*\(\s*['"`]\/v1\// },
  { name: 'template /v1/', regex: /['"`][^'"`]*\$\{[^}]+\}\/v1\// },
];

// ── Allowlisted files (relative to SRC_DIR, forward slashes) ─────────────────
// Sanctioned holders: the BFF client layer, the dev-fallback module, and the
// WS realtime service that calls the BFF ws-token endpoint.

const ALLOWLIST_FILES = new Set([
  'api/client.ts',
  'api/dev-fallback.ts',
  'api/services/chat-realtime-service.ts',
]);

// ── Opt-out comment regex ─────────────────────────────────────────────────────

const OPTOUT_RE = /\/\/\s*no-direct-core-ok:/i;

// ── Directory exclusions ──────────────────────────────────────────────────────

const EXCLUDED_DIRS = new Set([
  '__tests__',
  '__mocks__',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.expo',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*');
}

/** Recursive directory walker — skips excluded dirs and non-TS/TSX files. */
function walkDir(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (entry.isFile() && /\.(ts|tsx|mjs)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/** Normalise absolute path → posix-style relative to SRC_DIR. */
function relPath(absPath) {
  return posix.normalize(relative(SRC_DIR, absPath).replace(/\\/g, '/'));
}

// ── Main ──────────────────────────────────────────────────────────────────────

const files = walkDir(SRC_DIR);
const violations = [];

for (const file of files) {
  const rel = relPath(file);

  if (ALLOWLIST_FILES.has(rel)) continue;

  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isCommentLine(line)) continue;
    if (OPTOUT_RE.test(line)) continue;
    if (i > 0 && OPTOUT_RE.test(lines[i - 1])) continue;

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.regex.test(line)) {
        violations.push({ rel, line: i + 1, pattern: pattern.name });
        break;
      }
    }
  }
}

if (violations.length > 0) {
  violations.sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line);
  for (const v of violations) {
    process.stderr.write(`${v.rel}:${v.line} — pattern "${v.pattern}"\n`);
  }
  process.exit(1);
}

process.stdout.write(`OK: no direct Core access detected (${files.length} files scanned)\n`);
