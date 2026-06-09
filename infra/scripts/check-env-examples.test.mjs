#!/usr/bin/env node
/**
 * Unit tests for check-env-examples.mjs logic (inline, no external deps).
 * Run: node infra/scripts/check-env-examples.test.mjs
 */

import assert from 'node:assert/strict';

// ── Inline copies of pure helpers from check-env-examples.mjs ────────────────

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

const DEPRECATED_COMMENT_RE = /DEPRECATED\s*[—-]\s*REMOVE\s+\d{4}-\d{2}-\d{2}/i;

function checkDeprecatedComments(text, keys) {
  const violations = [];
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match) continue;
    const key = match[1];
    if (!keys.has(key)) continue;
    const prevLines = lines.slice(Math.max(0, i - 2), i);
    const hasDeprecated = prevLines.some(l => DEPRECATED_COMMENT_RE.test(l));
    if (!hasDeprecated) {
      violations.push({ key, line: i + 1 });
    }
  }
  return violations;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
    failed++;
  }
}

// parseDotenvKeys
test('parseDotenvKeys: ignores comments and blanks', () => {
  const text = `# comment\nFOO=bar\n\nBAZ=qux\n`;
  assert.deepEqual(parseDotenvKeys(text), ['FOO', 'BAZ']);
});

test('parseDotenvKeys: handles export prefix', () => {
  const text = `export MY_KEY=value\n`;
  assert.deepEqual(parseDotenvKeys(text), ['MY_KEY']);
});

// checkDeprecatedComments — passing fixture
test('checkDeprecatedComments: no violation when comment is present', () => {
  const text = [
    '# NEXT_PUBLIC_WS_URL=ws://localhost:8000',
    '# DEPRECATED — REMOVE 2026-09-01 — superseded by NEXT_PUBLIC_WS_URL.',
    'NEXT_PUBLIC_CORE_WS_URL=ws://localhost:8000',
  ].join('\n');
  const violations = checkDeprecatedComments(text, new Set(['NEXT_PUBLIC_CORE_WS_URL']));
  assert.equal(violations.length, 0);
});

// checkDeprecatedComments — failing fixture
test('checkDeprecatedComments: violation when no DEPRECATED comment above key', () => {
  const text = [
    '# Some unrelated comment',
    'EXPO_PUBLIC_CORE_WS_URL=',
  ].join('\n');
  const violations = checkDeprecatedComments(text, new Set(['EXPO_PUBLIC_CORE_WS_URL']));
  assert.equal(violations.length, 1);
  assert.equal(violations[0].key, 'EXPO_PUBLIC_CORE_WS_URL');
});

// checkDeprecatedComments — key not in sunset set: no violation
test('checkDeprecatedComments: ignores keys not in sunset set', () => {
  const text = 'SOME_OTHER_KEY=value\n';
  const violations = checkDeprecatedComments(text, new Set(['NEXT_PUBLIC_CORE_WS_URL']));
  assert.equal(violations.length, 0);
});

// DEPRECATED_COMMENT_RE accepts variants
test('DEPRECATED_COMMENT_RE: matches dash variant', () => {
  assert.match('# DEPRECATED - REMOVE 2026-09-01 — superseded', DEPRECATED_COMMENT_RE);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
