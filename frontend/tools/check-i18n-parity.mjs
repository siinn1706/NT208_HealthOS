#!/usr/bin/env node
/**
 * check-i18n-parity.mjs
 * Validates parity between en.json and vi.json i18n bundles.
 * Reports: missing keys, extra keys, Vietnamese chars in EN values,
 * English-only text in VI values (simple heuristic).
 *
 * Usage: node tools/check-i18n-parity.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(__dir, "../messages");

const en = JSON.parse(readFileSync(resolve(messagesDir, "en.json"), "utf8"));
const vi = JSON.parse(readFileSync(resolve(messagesDir, "vi.json"), "utf8"));

// Vietnamese diacritic range — excludes × (U+00D7) and ÷ (U+00F7) which are math symbols
const VI_RE = /[\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u1E00-\u1EFF]/;
// Latin-only (no diacritics) — used to flag suspicious VI values
const LATIN_ONLY_RE = /^[A-Za-z0-9 .,!?;:()\-_'"{}@#%/\n\t]+$/;

let issues = 0;

/** Flatten a nested object into dot-path keys */
function flatten(obj, prefix = "") {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(result, flatten(v, path));
    } else {
      result[path] = v;
    }
  }
  return result;
}

const flatEn = flatten(en);
const flatVi = flatten(vi);

const enKeys = new Set(Object.keys(flatEn));
const viKeys = new Set(Object.keys(flatVi));

// 1. Keys in EN but missing in VI
const missingInVi = [...enKeys].filter((k) => !viKeys.has(k));
if (missingInVi.length) {
  console.log(`\n❌ Keys in en.json but MISSING in vi.json (${missingInVi.length}):`);
  missingInVi.forEach((k) => console.log(`   ${k}`));
  issues += missingInVi.length;
}

// 2. Keys in VI but missing in EN
const missingInEn = [...viKeys].filter((k) => !enKeys.has(k));
if (missingInEn.length) {
  console.log(`\n❌ Keys in vi.json but MISSING in en.json (${missingInEn.length}):`);
  missingInEn.forEach((k) => console.log(`   ${k}`));
  issues += missingInEn.length;
}

// 3. Vietnamese diacritics found in EN values
const viCharsInEn = Object.entries(flatEn).filter(
  ([, v]) => typeof v === "string" && VI_RE.test(v)
);
if (viCharsInEn.length) {
  console.log(`\n⚠️  Vietnamese characters found in en.json values (${viCharsInEn.length}):`);
  viCharsInEn.forEach(([k, v]) => console.log(`   ${k}: "${v}"`));
  issues += viCharsInEn.length;
}

// 4. Latin-only values in VI (likely untranslated)
const latinOnlyInVi = Object.entries(flatVi).filter(
  ([, v]) => typeof v === "string" && v.length > 3 && LATIN_ONLY_RE.test(v)
);
if (latinOnlyInVi.length) {
  console.log(`\n⚠️  Possibly untranslated values in vi.json (Latin-only, ${latinOnlyInVi.length}):`);
  latinOnlyInVi.forEach(([k, v]) => console.log(`   ${k}: "${v}"`));
  // Don't count these as hard errors — some EN names are intentionally kept
}

// Summary
if (issues === 0) {
  console.log("\n✅ i18n parity check passed — no key mismatches or stray Vietnamese in EN bundle.");
} else {
  console.log(`\n❌ i18n parity check failed — ${issues} issue(s) found.`);
  process.exit(1);
}
