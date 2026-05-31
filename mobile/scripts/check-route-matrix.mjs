#!/usr/bin/env node
/**
 * Checks that known route samples and static router targets have a matching app
 * file. Handles dynamic segments [id] as wildcards via glob.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, '..');
const appDir = join(appRoot, 'app');
const srcDir = join(appRoot, 'src');

function routesFile() {
  return readFileSync(join(appRoot, 'src', 'lib', 'routes.ts'), 'utf8');
}

function extractRoutesMap(src) {
  const matches = [...src.matchAll(/:\s*'([^']+)'/g)];
  return matches.map((m) => m[1]);
}

function collectSourceFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === '__mocks__') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

function normalizeRouteLiteral(route) {
  const clean = route.split(/[?#]/)[0];
  if (!clean.startsWith('/') || clean.startsWith('//') || clean.startsWith('/v1/')) return null;
  const publicSegments = clean
    .split('/')
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')));
  const normalized = `/${publicSegments.join('/')}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

function normalizeTemplateRoute(route) {
  return route.replace(/\$\{[^}]+\}/g, 'test-id');
}

function addRoute(routes, rawRoute, source) {
  const route = normalizeRouteLiteral(rawRoute);
  if (!route) return;
  if (!routes.has(route)) routes.set(route, new Set());
  routes.get(route).add(source);
}

function extractStaticRouteTargets(file, routes) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(appRoot, file).replace(/\\/g, '/');
  const patterns = [
    /\brouter\.(?:push|replace)\(\s*['"]([^'"]+)['"]/g,
    /\b(?:href|pathname)\s*=\s*['"]([^'"]+)['"]/g,
    /\b(?:href|pathname|route)\s*:\s*['"]([^'"]+)['"]/g,
  ];

  for (const pattern of patterns) {
    for (const match of src.matchAll(pattern)) {
      addRoute(routes, match[1], rel);
    }
  }

  for (const match of src.matchAll(/\brouter\.(?:push|replace)\(\s*`([^`]+)`/g)) {
    addRoute(routes, normalizeTemplateRoute(match[1]), rel);
  }
}

/** Collect all .tsx files under app/ as canonical paths like /care/appointments/new */
function collectAppFiles(dir, base = '') {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectAppFiles(full, `${base}/${entry}`));
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      const name = entry.replace(/\.(tsx|ts)$/, '');
      // index files: /foo/index → /foo
      const routePart = name === 'index' ? base : `${base}/${name}`;
      results.push(routePart);
    }
  }
  return results;
}

/** Convert app file paths to public URL paths: /(tabs)/home -> /home. */
function normalizeAppPath(p) {
  const publicSegments = p
    .split('/')
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')));
  return `/${publicSegments.join('/')}`;
}

/** Check if a route matches any app file, treating [xxx] segments as wildcards */
function routeMatchesFile(route, appPaths) {
  // Split route into segments, replacing dynamic [param] with wildcard
  const routeSegments = route.split('/').filter(Boolean);

  return appPaths.some((ap) => {
    const apSegments = ap.split('/').filter(Boolean);
    if (apSegments.length !== routeSegments.length) return false;
    return routeSegments.every((seg, i) => {
      const apSeg = apSegments[i];
      // dynamic segment in app file
      if (apSeg && apSeg.startsWith('[') && apSeg.endsWith(']')) return true;
      // dynamic-like value in route (test-id, etc.) matched against dynamic app segment only — handled above
      return seg === apSeg;
    });
  });
}

const src = routesFile();
const routes = new Map();
for (const route of extractRoutesMap(src)) {
  addRoute(routes, route, 'src/lib/routes.ts');
}
for (const file of [...collectSourceFiles(appDir), ...collectSourceFiles(srcDir)]) {
  extractStaticRouteTargets(file, routes);
}
const appFiles = collectAppFiles(appDir).map(normalizeAppPath);

let failures = 0;
for (const route of [...routes.keys()].sort()) {
  if (routeMatchesFile(route, appFiles)) {
    console.log(`  ✓ ${route}`);
  } else {
    const sources = [...routes.get(route)].join(', ');
    console.log(`  ✗ MISSING: ${route} (${sources})`);
    failures++;
  }
}

console.log(`\n${routes.size} routes checked. ${failures} missing.`);
if (failures > 0) process.exit(1);
