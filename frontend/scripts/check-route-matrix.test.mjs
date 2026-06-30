#!/usr/bin/env node
/**
 * Minimal test for check-route-matrix.mjs using in-process fixture data.
 */

import { strictEqual } from 'assert';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const OPTOUT_RE = /\/\/\s*route-matrix-ok:/i;

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
      if (ch === '$' && line[i + 1] === '{') {
        let depth = 1;
        i += 2;
        while (i < line.length && depth > 0) {
          if (line[i] === '{') depth++;
          else if (line[i] === '}') depth--;
          i++;
        }
        path += ':param';
        continue;
      }
      if (
        ch === '?' || ch === ' ' || ch === '\t' || ch === '"' || ch === "'"
        || ch === '`' || ch === ')' || ch === ']' || ch === ',' || ch === ';'
      ) {
        break;
      }
      path += ch;
      i++;
    }
    paths.push(normalizePath(path));
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
    if (OPTOUT_RE.test(line)) continue;
    if (i > 0 && OPTOUT_RE.test(lines[i - 1])) continue;
    const method = inferMethodForLine(lines, i);
    for (const path of extractPathsFromLine(line)) {
      refs.push({ lineNo: i + 1, path, method });
    }
  }
  return refs;
}

function runCheck(handlers, source) {
  const violations = [];
  for (const ref of extractApiRefs(source)) {
    const methods = handlers.get(ref.path);
    if (!methods?.has(ref.method)) {
      violations.push(ref);
    }
  }
  return violations;
}

// Test 1: matching handler and method -> no violations.
{
  const handlers = new Map([['/api/v1/users/me', new Set(['GET'])]]);
  const source = `bffFetch('/api/v1/users/me', { method: 'GET' });`;
  const violations = runCheck(handlers, source);
  strictEqual(violations.length, 0, 'Test 1 FAILED: expected no violations for matched handler');
  console.log('Test 1 PASS: matched handler produces no violations');
}

// Test 2: missing handler -> one violation.
{
  const handlers = new Map([['/api/v1/users/me', new Set(['GET'])]]);
  const source = `bffFetch('/api/v1/__test_missing__');`;
  const violations = runCheck(handlers, source);
  strictEqual(violations.length, 1, 'Test 2 FAILED: expected exactly one violation');
  strictEqual(violations[0].path, '/api/v1/__test_missing__', 'Test 2 FAILED: wrong path reported');
  console.log('Test 2 PASS: missing handler produces one violation');
}

// Test 3: opt-out comment suppresses violation.
{
  const handlers = new Map([['/api/v1/users/me', new Set(['GET'])]]);
  const source = [
    '// route-matrix-ok: external partner endpoint, no BFF handler needed',
    `bffFetch('/api/v1/external/partner');`,
  ].join('\n');
  const violations = runCheck(handlers, source);
  strictEqual(violations.length, 0, 'Test 3 FAILED: opt-out should suppress violation');
  console.log('Test 3 PASS: route-matrix-ok opt-out suppresses violation');
}

// Test 4: dynamic segment normalization.
{
  const handlers = new Map([['/api/v1/conversations/:param/messages', new Set(['GET'])]]);
  const source = 'bffFetch(`/api/v1/conversations/${convId}/messages`);';
  const violations = runCheck(handlers, source);
  strictEqual(violations.length, 0, 'Test 4 FAILED: template literal ${var} should normalize to :param');
  console.log('Test 4 PASS: template literal dynamic segment normalized correctly');
}

// Test 5: [id] handler does not match hard-coded numeric IDs.
{
  const handlers = new Map([[normalizePath('/api/v1/appointments/[id]'), new Set(['GET'])]]);
  const source = `bffFetch('/api/v1/appointments/123');`;
  const violations = runCheck(handlers, source);
  strictEqual(violations.length, 1, 'Test 5 FAILED: bare numeric literal should not match :param handler');
  console.log('Test 5 PASS: bare numeric id does not incorrectly match :param handler');
}

// Test 6: matching path with missing method is a violation.
{
  const handlers = new Map([['/api/v1/devices/:param/sync-state', new Set(['GET'])]]);
  const source = [
    'apiRequest(`/api/v1/devices/${encodeURIComponent(deviceId)}/sync-state`, {',
    "  method: 'PUT',",
    '  json: { tokens },',
    '});',
  ].join('\n');
  const violations = runCheck(handlers, source);
  strictEqual(violations.length, 1, 'Test 6 FAILED: missing PUT export should be a violation');
  strictEqual(violations[0].method, 'PUT', 'Test 6 FAILED: wrong method reported');
  console.log('Test 6 PASS: method mismatch is reported');
}

// Test 7: matching path and method across multiple lines is covered.
{
  const handlers = new Map([['/api/v1/devices/:param/sync-state', new Set(['GET', 'PUT'])]]);
  const source = [
    'apiRequest(`/api/v1/devices/${encodeURIComponent(deviceId)}/sync-state`, {',
    "  method: 'PUT',",
    '  json: { tokens },',
    '});',
  ].join('\n');
  const violations = runCheck(handlers, source);
  strictEqual(violations.length, 0, 'Test 7 FAILED: exported PUT should cover the call');
  console.log('Test 7 PASS: method-aware route coverage works');
}

// Test 8: method hidden behind a local init variable is inferred.
{
  const handlers = new Map([['/api/v1/medications/:param/pause', new Set(['POST'])]]);
  const source = [
    "const init = body === undefined ? { method: 'POST' as const } : { method: 'POST' as const, json: body };",
    'apiRequest(`/api/v1/medications/${encodeURIComponent(id)}/pause`, init);',
  ].join('\n');
  const violations = runCheck(handlers, source);
  strictEqual(violations.length, 0, 'Test 8 FAILED: local init method should be inferred');
  console.log('Test 8 PASS: local init method inferred correctly');
}

console.log('\nAll 8 tests passed.');
