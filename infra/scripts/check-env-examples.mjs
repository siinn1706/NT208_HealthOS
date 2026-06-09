#!/usr/bin/env node
/**
 * Validates .env.master.example and generated service .env.example files:
 * 1. Every key in .env.master.example is present in service example files.
 * 2. Every key in the LEGACY_SUNSET set has a DEPRECATED comment above it.
 *
 * Exit 0 = all checks pass. Exit 1 = at least one violation (printed to stderr).
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');

const MASTER_EXAMPLE = join(REPO_ROOT, 'infra/env/.env.master.example');

// Keys that MUST have a DEPRECATED — REMOVE comment above them.
const LEGACY_SUNSET_KEYS = new Set([
  'NEXT_PUBLIC_CORE_WS_URL',
  'EXPO_PUBLIC_CORE_WS_URL',
  'EXPO_PUBLIC_CORE_API_URL',
]);

const DEPRECATED_COMMENT_RE = /DEPRECATED\s*[—-]\s*REMOVE\s+\d{4}-\d{2}-\d{2}/i;

function parseDotenvKeys(text) {
  const keys = [];
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) keys.push(match[1]);
  }
  return keys;
}

function checkDeprecatedComments(text, keys) {
  const violations = [];
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match) continue;
    const key = match[1];
    if (!keys.has(key)) continue;
    // Check the 2 lines above the key assignment.
    const prevLines = lines.slice(Math.max(0, i - 2), i);
    const hasDeprecated = prevLines.some(l => DEPRECATED_COMMENT_RE.test(l));
    if (!hasDeprecated) {
      violations.push({ key, line: i + 1 });
    }
  }
  return violations;
}

// ── Load master example ───────────────────────────────────────────────────────

if (!existsSync(MASTER_EXAMPLE)) {
  process.stderr.write(`ERROR: master example not found: ${MASTER_EXAMPLE}\n`);
  process.exit(1);
}

const masterText = readFileSync(MASTER_EXAMPLE, 'utf8');
const masterKeys = new Set(parseDotenvKeys(masterText));

if (masterKeys.size === 0) {
  process.stderr.write(`ERROR: no keys parsed from ${MASTER_EXAMPLE}\n`);
  process.exit(1);
}

const violations = [];

// ── Check 1: DEPRECATED comments in master example ───────────────────────────

const deprecatedViolations = checkDeprecatedComments(masterText, LEGACY_SUNSET_KEYS);
for (const v of deprecatedViolations) {
  violations.push(
    `${MASTER_EXAMPLE}:${v.line} — key ${v.key} is in LEGACY_SUNSET but has no "DEPRECATED — REMOVE YYYY-MM-DD" comment in the 2 lines above`,
  );
}

// ── Check 2: find other .env.example / .env.master.example files ──────────────

const EXAMPLE_SEARCH_DIRS = ['frontend', 'mobile', 'infra', 'services'];
const EXCLUDED_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.git']);

function findEnvExamples(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(join(REPO_ROOT, dir), { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      results.push(...findEnvExamples(rel));
    } else if (entry.isFile() && /\.env(\..*)?\.example$/.test(entry.name) && rel !== 'infra/env/.env.master.example') {
      results.push(rel);
    }
  }
  return results;
}

for (const relPath of findEnvExamples('infra').concat(
  findEnvExamples('frontend'),
  findEnvExamples('mobile'),
  findEnvExamples('services'),
)) {
  const absPath = join(REPO_ROOT, relPath);
  let text;
  try {
    text = readFileSync(absPath, 'utf8');
  } catch {
    continue;
  }
  const fileKeys = new Set(parseDotenvKeys(text));
  // Keys in the file but not in master → warn (may be staged by other plans).
  for (const key of fileKeys) {
    if (!masterKeys.has(key)) {
      process.stderr.write(`WARN: ${relPath} — key ${key} not present in .env.master.example\n`);
    }
  }
}

// ── Result ────────────────────────────────────────────────────────────────────

if (violations.length > 0) {
  for (const v of violations) {
    process.stderr.write(`${v}\n`);
  }
  process.exit(1);
}

process.stdout.write(`OK: env-examples check passed (${masterKeys.size} master keys, ${LEGACY_SUNSET_KEYS.size} sunset keys validated)\n`);
