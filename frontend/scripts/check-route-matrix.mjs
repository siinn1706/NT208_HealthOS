#!/usr/bin/env node
/**
 * Asserts every /api/v1/** path+method called from FE client code or mobile
 * services has a matching route.ts handler under frontend/src/app/api/v1/.
 *
 * Exit 0 = all references covered.  Exit 1 = at least one gap (printed to stderr).
 *
 * Per-line opt-out: add `// route-matrix-ok: <reason>` on the offending line
 * or the line above it.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, join, relative, dirname } from 'path';
import { posix } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(FRONTEND_ROOT, '..');

const BFF_HANDLER_DIR = join(FRONTEND_ROOT, 'src', 'app', 'api', 'v1');
const FE_CLIENT_DIRS = [
  join(FRONTEND_ROOT, 'src', 'components'),
  join(FRONTEND_ROOT, 'src', 'hooks'),
  join(FRONTEND_ROOT, 'src', 'lib'),
  join(FRONTEND_ROOT, 'src', 'app'),
];
const FE_CLIENT_EXCLUDE_PREFIX = join(FRONTEND_ROOT, 'src', 'app', 'api', 'v1');
const MOBILE_SERVICE_DIR = join(REPO_ROOT, 'mobile', 'src', 'api', 'services');

const OPTOUT_RE = /\/\/\s*route-matrix-ok:/i;
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

// Server-side files that contain /api/v1/** URL strings as config/allowlists,
// not as actual client fetch calls.
const ALLOWLIST_REL = new Set([
  'lib/bff-origin-guard.ts',
  'lib/admin/bff-admin-client.ts',
]);

const EXCLUDED_DIRS = new Set([
  '__tests__',
  '__mocks__',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
]);

// ── Path normalization ────────────────────────────────────────────────────────

/**
 * Normalize a raw path string (possibly with dynamic segments) to a canonical
 * form for set-diff.
 *
 *  [id], [plan_id], :id, :slug  → :param
 *  bare trailing `:param` not preceded by `/` (= query-string template suffix) → stripped
 *  Query strings stripped.  Trailing slashes stripped.
 */
function normalizePath(p) {
  return p
    .replace(/\?.*$/, '')                                      // strip query string
    .replace(/\/+$/, '')                                       // strip trailing slash
    .replace(/\[[^\]]+\]/g, ':param')                         // [id] → :param
    .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, ':param')            // :id → :param
    .replace(/([^/]):param$/, '$1')                            // strip trailing :param not after / (query suffix)
    .replace(/:param\/:param/g, ':param')                      // collapse adjacent :param/:param
    .toLowerCase();
}

// ── Handler inventory ─────────────────────────────────────────────────────────

function collectRouteMethods(file) {
  const source = readFileSync(file, 'utf8');
  const methods = new Set();
  const exportedFunctionRe = /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
  const exportedListRe = /export\s*\{([^}]+)\}/g;
  let match;

  while ((match = exportedFunctionRe.exec(source)) !== null) {
    methods.add(match[1].toUpperCase());
  }
  while ((match = exportedListRe.exec(source)) !== null) {
    for (const part of match[1].split(',')) {
      const candidate = part.trim().split(/\s+as\s+/i)[0]?.trim().toUpperCase();
      if (HTTP_METHODS.has(candidate)) methods.add(candidate);
    }
  }
  return methods;
}

function addHandler(handlers, path, methods) {
  const existing = handlers.get(path) ?? new Set();
  for (const method of methods) existing.add(method);
  handlers.set(path, existing);
}

function collectHandlers(dir, prefix = '/api/v1') {
  const handlers = new Map();
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return handlers;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const seg = entry.name.startsWith('(') ? '' : `/${normalizePath(entry.name)}`;
      for (const [p, methods] of collectHandlers(full, prefix + seg)) {
        addHandler(handlers, p, methods);
      }
    } else if (entry.isFile() && entry.name === 'route.ts') {
      const methods = collectRouteMethods(full);
      if (methods.size > 0) addHandler(handlers, normalizePath(prefix), methods);
    }
  }
  return handlers;
}

// ── Client reference extraction ───────────────────────────────────────────────

function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*');
}

/**
 * State-machine path extractor: finds every /api/v1/... occurrence in a line
 * and reconstructs the full path, correctly handling `${...}` expressions
 * (including nested braces/backticks) by replacing each interpolation with :param.
 */
function extractPathsFromLine(line) {
  const paths = [];
  const BFF_PREFIX = '/api/v1/';
  let search = 0;

  while (search < line.length) {
    const start = line.indexOf(BFF_PREFIX, search);
    if (start === -1) break;
    search = start + 1;

    let path = BFF_PREFIX;
    let i = start + BFF_PREFIX.length;

    while (i < line.length) {
      const ch = line[i];

      // Template expression ${...}
      if (ch === '$' && line[i + 1] === '{') {
        // Count brace depth to find the matching }
        let depth = 1;
        i += 2; // skip '${'
        while (i < line.length && depth > 0) {
          if (line[i] === '{') depth++;
          else if (line[i] === '}') depth--;
          i++;
        }
        path += ':param';
        continue;
      }

      // Stop characters — these clearly end the path
      if (
        ch === '?' ||  // query string
        ch === ' ' || ch === '\t' ||  // whitespace
        ch === '"' || ch === "'" || ch === '`' ||  // string delimiters
        ch === ')' || ch === ']' || ch === ',' || ch === ';'  // expression terminators
      ) {
        break;
      }

      path += ch;
      i++;
    }

    if (path.length > BFF_PREFIX.length) {
      paths.push(normalizePath(path));
    } else {
      // bare /api/v1/ with nothing after
      paths.push(normalizePath('/api/v1'));
    }
  }

  return paths;
}

function inferMethodForLine(lines, index) {
  const chunk = [];
  for (let i = index; i < Math.min(lines.length, index + 8); i++) {
    chunk.push(lines[i]);
    if (/[);]\s*;?\s*$/.test(lines[i].trim())) break;
  }
  const chunkText = chunk.join('\n');
  const methodMatch = chunkText.match(/\bmethod\s*:\s*['"`]([A-Za-z]+)['"`]/);
  if (!methodMatch) {
    const initMatch = chunkText.match(/,\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)?\s*;?\s*$/);
    const initName = initMatch?.[1];
    if (initName) {
      const escapedName = initName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const priorText = lines.slice(Math.max(0, index - 6), index).join('\n');
      const initMethodMatch = priorText.match(
        new RegExp(`\\b(?:const|let)\\s+${escapedName}\\b[\\s\\S]*?\\bmethod\\s*:\\s*['"\`]([A-Za-z]+)['"\`]`),
      );
      const initMethod = initMethodMatch?.[1]?.toUpperCase();
      if (HTTP_METHODS.has(initMethod)) return initMethod;
    }
  }
  const method = methodMatch?.[1]?.toUpperCase();
  return HTTP_METHODS.has(method) ? method : 'GET';
}

function extractApiRefs(source) {
  const refs = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isCommentLine(line)) continue;
    if (OPTOUT_RE.test(line)) continue;
    if (i > 0 && OPTOUT_RE.test(lines[i - 1])) continue;

    const method = inferMethodForLine(lines, i);
    for (const path of extractPathsFromLine(line)) {
      refs.push({ lineNo: i + 1, path, method });
    }
  }
  return refs;
}

// ── Directory walker ──────────────────────────────────────────────────────────

function walkDir(dir, excludePrefix = null) {
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
    if (excludePrefix && full.startsWith(excludePrefix)) continue;
    if (entry.isDirectory()) {
      results.push(...walkDir(full, excludePrefix));
    } else if (entry.isFile() && /\.(ts|tsx|mjs)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx|mjs)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function relToFE(absPath) {
  return posix.normalize(
    relative(join(FRONTEND_ROOT, 'src'), absPath).replace(/\\/g, '/'),
  );
}

function relToRepo(absPath) {
  return posix.normalize(relative(REPO_ROOT, absPath).replace(/\\/g, '/'));
}

// ── Main ──────────────────────────────────────────────────────────────────────

const handlers = collectHandlers(BFF_HANDLER_DIR);

if (handlers.size === 0) {
  process.stderr.write('ERROR: no BFF route handlers found under frontend/src/app/api/v1/\n');
  process.exit(1);
}

const violations = [];

for (const dir of FE_CLIENT_DIRS) {
  for (const file of walkDir(dir, FE_CLIENT_EXCLUDE_PREFIX)) {
    if (ALLOWLIST_REL.has(relToFE(file))) continue;
    let source;
    try { source = readFileSync(file, 'utf8'); } catch { continue; }
    const relFile = relToRepo(file);
    for (const ref of extractApiRefs(source)) {
      const methods = handlers.get(ref.path);
      if (!methods?.has(ref.method)) {
        violations.push({ file: relFile, line: ref.lineNo, path: ref.path, method: ref.method });
      }
    }
  }
}

for (const file of walkDir(MOBILE_SERVICE_DIR)) {
  let source;
  try { source = readFileSync(file, 'utf8'); } catch { continue; }
  const relFile = relToRepo(file);
  for (const ref of extractApiRefs(source)) {
    const methods = handlers.get(ref.path);
    if (!methods?.has(ref.method)) {
      violations.push({ file: relFile, line: ref.lineNo, path: ref.path, method: ref.method });
    }
  }
}

if (violations.length > 0) {
  // Deduplicate (same file:line:path)
  const seen = new Set();
  const unique = violations.filter((v) => {
    const k = `${v.file}:${v.line}:${v.method}:${v.path}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  unique.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  for (const v of unique) {
    process.stderr.write(`${v.file}:${v.line} — calls ${v.method} ${v.path} — no BFF route handler method\n`);
  }
  process.exit(1);
}

process.stdout.write(`OK: ${handlers.size} BFF route paths cover all /api/v1/** method references\n`);
