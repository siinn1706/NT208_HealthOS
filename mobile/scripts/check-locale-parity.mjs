#!/usr/bin/env node
/**
 * Checks that vi.json and en.json have identical key sets.
 * Exits with code 1 and prints diff if any mismatch is found.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '../src/i18n/locales');

/** Recursively extract all scalar key paths, e.g. "profile.fieldFullName" */
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

const vi = JSON.parse(readFileSync(join(localesDir, 'vi.json'), 'utf-8'));
const en = JSON.parse(readFileSync(join(localesDir, 'en.json'), 'utf-8'));

const viKeys = new Set(extractPaths(vi));
const enKeys = new Set(extractPaths(en));

const onlyInVi = [...viKeys].filter((k) => !enKeys.has(k)).sort();
const onlyInEn = [...enKeys].filter((k) => !viKeys.has(k)).sort();

if (onlyInVi.length === 0 && onlyInEn.length === 0) {
  console.log('✓ Locale parity check passed — vi.json and en.json are in sync.');
  process.exit(0);
}

if (onlyInVi.length > 0) {
  console.error(`\n✗ Keys only in vi.json (${onlyInVi.length}):`);
  onlyInVi.forEach((k) => console.error(`  - ${k}`));
}
if (onlyInEn.length > 0) {
  console.error(`\n✗ Keys only in en.json (${onlyInEn.length}):`);
  onlyInEn.forEach((k) => console.error(`  - ${k}`));
}

console.error('\nFix: add missing keys to both locale files before merging.');
process.exit(1);
