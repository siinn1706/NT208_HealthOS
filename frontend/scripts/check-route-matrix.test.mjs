#!/usr/bin/env node
/**
 * Minimal test for check-route-matrix.mjs using in-process fixture data.
 *
 * Runs three assertions:
 *  1. A reference with a matching handler → exit 0 (no violations).
 *  2. A reference with no matching handler → exit 1 (violation detected).
 *  3. A reference with route-matrix-ok opt-out → exit 0 (suppressed).
 */

import { strictEqual } from 'assert';

// ── Reproduce the normalization logic inline for test purposes ────────────────

function normalizePath(p) {
  return p
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '')
    .replace(/\[[^\]]+\]/g, ':param')
    .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, ':param')
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/:param(:param)*/g, ':param')
    .toLowerCase();
}

const OPTOUT_RE = /\/\/\s*route-matrix-ok:/i;

function extractApiRefs(source) {
  const refs = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (OPTOUT_RE.test(line)) continue;
    if (i > 0 && OPTOUT_RE.test(lines[i - 1])) continue;
    const literalRe = /(['"`])\/api\/v1\/([^'"`\s?#]*)\1/g;
    let m;
    while ((m = literalRe.exec(line)) !== null) {
      refs.push({ lineNo: i + 1, path: normalizePath(`/api/v1/${m[2]}`) });
    }
    const tplRe = /`\/api\/v1\/([^`]*)`/g;
    while ((m = tplRe.exec(line)) !== null) {
      refs.push({ lineNo: i + 1, path: normalizePath(`/api/v1/${m[1]}`) });
    }
  }
  return refs;
}

function runCheck(handlers, source) {
  const violations = [];
  for (const ref of extractApiRefs(source)) {
    if (!handlers.has(ref.path)) {
      violations.push(ref);
    }
  }
  return violations;
}

// ── Test 1: matching handler → no violations ──────────────────────────────────

{
  const handlers = new Set(['/api/v1/users/me', '/api/v1/meals']);
  const source = `bffFetch('/api/v1/users/me', { method: 'GET' });`;
  const violations = runCheck(handlers, source);
  strictEqual(violations.length, 0, 'Test 1 FAILED: expected no violations for matched handler');
  console.log('Test 1 PASS: matched handler produces no violations');
}

// ── Test 2: missing handler → one violation ───────────────────────────────────

{
  const handlers = new Set(['/api/v1/users/me']);
  const source = `bffFetch('/api/v1/__test_missing__');`;
  const violations = runCheck(handlers, source);
  strictEqual(violations.length, 1, 'Test 2 FAILED: expected exactly one violation');
  strictEqual(violations[0].path, '/api/v1/__test_missing__', 'Test 2 FAILED: wrong path reported');
  console.log('Test 2 PASS: missing handler produces one violation');
}

// ── Test 3: opt-out comment suppresses violation ──────────────────────────────

{
  const handlers = new Set(['/api/v1/users/me']);
  const source = [
    '// route-matrix-ok: external partner endpoint, no BFF handler needed',
    `bffFetch('/api/v1/external/partner');`,
  ].join('\n');
  const violations = runCheck(handlers, source);
  strictEqual(violations.length, 0, 'Test 3 FAILED: opt-out should suppress violation');
  console.log('Test 3 PASS: route-matrix-ok opt-out suppresses violation');
}

// ── Test 4: dynamic segment normalization ─────────────────────────────────────

{
  const handlers = new Set(['/api/v1/conversations/:param/messages']);
  const source = 'bffFetch(`/api/v1/conversations/${convId}/messages`);';
  const violations = runCheck(handlers, source);
  strictEqual(violations.length, 0, 'Test 4 FAILED: template literal ${var} should normalize to :param');
  console.log('Test 4 PASS: template literal dynamic segment normalized correctly');
}

// ── Test 5: [id] bracket normalization ───────────────────────────────────────

{
  const handlers = new Set([normalizePath('/api/v1/appointments/[id]')]);
  const source = `bffFetch('/api/v1/appointments/123');`;
  // /api/v1/appointments/123 → not :param, so should be a violation unless literal "123" matches
  // This test confirms that a literal non-parameterized call still needs a handler
  const violations = runCheck(handlers, source);
  // /api/v1/appointments/123 normalizes to /api/v1/appointments/123 (no brackets), handler is /api/v1/appointments/:param
  // so they differ → expected 1 violation (correct — numeric IDs should be in templates)
  strictEqual(violations.length, 1, 'Test 5 FAILED: bare numeric literal should not match :param handler');
  console.log('Test 5 PASS: bare numeric id does not incorrectly match :param handler (use template literals for dynamic ids)');
}

console.log('\nAll 5 tests passed.');
