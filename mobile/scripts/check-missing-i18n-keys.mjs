#!/usr/bin/env node
/**
 * Scans mobile/src for i18n key usage and reports keys referenced in code
 * that are missing from locale files. Exits 1 when missing keys found.
 *
 * Patterns detected:   i18n('namespace.key')   t('namespace.key')
 * Dynamic keys skipped: i18n(variable)  → logged as warning
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '../src');
const localesDir = join(__dirname, '../src/i18n/locales');

// ── helpers ──────────────────────────────────────────────────────────────────

/** Recursively collect all .ts/.tsx files under a directory */
function walkTs(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkTs(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

/** Recursively extract all scalar key paths from a locale object */
function extractPaths(obj, prefix = '') {
  const paths = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...extractPaths(value, fullKey));
    } else {
      paths.push(fullKey);
    }
  }
  return paths;
}

// ── load locale keys ──────────────────────────────────────────────────────────

const en = JSON.parse(readFileSync(join(localesDir, 'en.json'), 'utf-8'));
const localeKeys = new Set(extractPaths(en));

// ── scan source files ─────────────────────────────────────────────────────────

// Match: i18n('some.key')  or  t('some.key')  — literal string only
const LITERAL_KEY_RE = /\b(?:i18n|t)\(\s*['"]([a-zA-Z][\w.]+)['"]/g;
// Detect dynamic call: i18n(variable)  — no literal string
const DYNAMIC_CALL_RE = /\b(?:i18n|t)\(\s*(?!['"])[a-zA-Z_$]\w*/g;

const usedKeys = new Set();
const dynamicWarnings = [];
const missingKeys = [];

for (const file of walkTs(srcDir)) {
  // Skip test files and locale files themselves
  if (file.includes('__tests__') || file.includes('/locales/')) continue;

  const content = readFileSync(file, 'utf-8');
  const relPath = file.replace(join(__dirname, '..') + '/', '');

  // Collect literal key usages
  for (const match of content.matchAll(LITERAL_KEY_RE)) {
    const key = match[1];
    // Skip keys that are clearly not namespace.key (e.g. single word)
    if (!key.includes('.')) continue;
    usedKeys.add(key);
    if (!localeKeys.has(key)) {
      missingKeys.push({ key, file: relPath });
    }
  }

  // Warn about dynamic calls (can't static-analyse)
  if (DYNAMIC_CALL_RE.test(content)) {
    dynamicWarnings.push(relPath);
  }
}

// ── report ────────────────────────────────────────────────────────────────────

if (dynamicWarnings.length > 0) {
  console.warn(`\n⚠  Dynamic i18n key calls detected in ${dynamicWarnings.length} file(s) — cannot validate statically:`);
  dynamicWarnings.slice(0, 5).forEach((f) => console.warn(`   ${f}`));
  if (dynamicWarnings.length > 5) console.warn(`   ... and ${dynamicWarnings.length - 5} more`);
}

if (missingKeys.length === 0) {
  console.log(`✓ Missing-keys check passed — all ${usedKeys.size} used keys exist in locale files.`);
  process.exit(0);
}

console.error(`\n✗ Keys used in code but missing from locale files (${missingKeys.length}):`);
const grouped = {};
for (const { key, file } of missingKeys) {
  if (!grouped[key]) grouped[key] = [];
  grouped[key].push(file);
}
for (const [key, files] of Object.entries(grouped)) {
  console.error(`  ${key}`);
  files.slice(0, 2).forEach((f) => console.error(`    └ ${f}`));
}
console.error('\nFix: add missing keys to both en.json and vi.json before merging.');
process.exit(1);
