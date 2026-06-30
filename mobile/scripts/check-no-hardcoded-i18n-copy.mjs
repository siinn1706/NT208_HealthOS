#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve, sep } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(__dirname, '..');
const DEFAULT_ALLOWLIST = join(__dirname, 'i18n-hardcoded-allowlist.json');

const SCAN_DIRS = ['app', 'src'];
const TEXT_COMPONENTS = ['Text', 'ButtonText', 'SectionTitle', 'ThemedText'];
const UI_STRING_PROPS = [
  'accessibilityHint',
  'accessibilityLabel',
  'actionLabel',
  'description',
  'emptyDescription',
  'emptyTitle',
  'error',
  'helper',
  'label',
  'message',
  'placeholder',
  'subtitle',
  'title',
];

const SKIP_PATH_SEGMENTS = [
  '__fixtures__',
  '__mocks__',
  '__tests__',
  'locales',
];
const SKIP_PATH_PREFIXES = [
  'app/dev/',
];

const SKIP_FILE_RE = /\.(test|spec)\.(ts|tsx)$/;
const LETTER_RE = /[A-Za-zÀ-ỹ]/;
const I18N_KEY_RE = /^[a-z][\w-]*(?:\.[a-z][\w-]*)+$/;

function parseArgs(argv) {
  const options = {
    root: mobileRoot,
    allowlist: DEFAULT_ALLOWLIST,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root') {
      options.root = resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '--allowlist') {
      options.allowlist = resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '--update-allowlist') {
      options.updateAllowlist = true;
    } else if (arg === '--help') {
      options.help = true;
    }
  }

  return options;
}

function normalizePath(value) {
  return value.split(sep).join('/');
}

function walkFiles(dir, root, out = []) {
  if (!existsSync(dir)) return out;

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const relPath = normalizePath(relative(root, fullPath));
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (SKIP_PATH_SEGMENTS.includes(entry)) continue;
      walkFiles(fullPath, root, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !SKIP_FILE_RE.test(entry) && !shouldSkipPath(relPath)) {
      out.push(fullPath);
    }
  }

  return out;
}

function shouldSkipPath(relPath) {
  const parts = relPath.split('/');
  return parts.some((part) => SKIP_PATH_SEGMENTS.includes(part))
    || SKIP_PATH_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

function readAllowlist(filePath = DEFAULT_ALLOWLIST) {
  if (!existsSync(filePath)) return { globalTexts: [], entries: [], patterns: [] };
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function compileAllowlist(parsed) {
  return {
    globalTexts: parsed.globalTexts ?? [],
    entries: parsed.entries ?? [],
    patterns: (parsed.patterns ?? []).map((entry) => ({
      ...entry,
      regex: new RegExp(entry.pattern),
    })),
  };
}

function loadAllowlist(filePath = DEFAULT_ALLOWLIST) {
  return compileAllowlist(readAllowlist(filePath));
}

function isTranslatableText(text) {
  const trimmed = normalizeText(text);
  if (!trimmed || !LETTER_RE.test(trimmed)) return false;
  if (I18N_KEY_RE.test(trimmed)) return false;
  if (/^\{\{.*\}\}$/.test(trimmed)) return false;
  if (/^[A-Z][A-Z0-9_ -]{0,12}$/.test(trimmed)) return false;
  return true;
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function lineForIndex(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function collectViolations(content, relPath) {
  const violations = [];
  const componentGroup = TEXT_COMPONENTS.join('|');
  const jsxTextRe = new RegExp(`<(${componentGroup})\\b[^>]*>\\s*([^<{][^<{}]*?)\\s*</\\1>`, 'g');
  const propRe = new RegExp(`\\b(${UI_STRING_PROPS.join('|')})\\s*=\\s*["']([^"']+)["']`, 'g');

  for (const match of content.matchAll(jsxTextRe)) {
    const text = normalizeText(match[2]);
    if (!isTranslatableText(text)) continue;
    violations.push({
      path: relPath,
      line: lineForIndex(content, match.index ?? 0),
      kind: 'jsx-text',
      text,
    });
  }

  for (const match of content.matchAll(propRe)) {
    const text = normalizeText(match[2]);
    if (!isTranslatableText(text)) continue;
    violations.push({
      path: relPath,
      line: lineForIndex(content, match.index ?? 0),
      kind: `prop:${match[1]}`,
      text,
    });
  }

  return violations;
}

function pathMatches(rulePath, relPath) {
  if (!rulePath) return true;
  if (rulePath === relPath) return true;
  if (rulePath.endsWith('/**')) {
    return relPath.startsWith(rulePath.slice(0, -3));
  }
  return false;
}

function isAllowed(violation, allowlist) {
  if (allowlist.globalTexts.includes(violation.text)) return true;
  if (allowlist.entries.some((entry) => pathMatches(entry.path, violation.path) && entry.text === violation.text)) {
    return true;
  }
  return allowlist.patterns.some((entry) => pathMatches(entry.path, violation.path) && entry.regex.test(violation.text));
}

export function findHardcodedCopy({ root = mobileRoot, allowlistPath = DEFAULT_ALLOWLIST } = {}) {
  const allowlist = loadAllowlist(allowlistPath);
  const files = SCAN_DIRS.flatMap((dir) => walkFiles(join(root, dir), root));
  const violations = [];

  for (const file of files) {
    const relPath = normalizePath(relative(root, file));
    const content = readFileSync(file, 'utf8');
    for (const violation of collectViolations(content, relPath)) {
      if (!isAllowed(violation, allowlist)) violations.push(violation);
    }
  }

  return violations;
}

function printHelp() {
  console.log('Usage: node scripts/check-no-hardcoded-i18n-copy.mjs [--root mobile] [--allowlist file] [--update-allowlist]');
}

function updateAllowlist(filePath, violations) {
  const allowlist = readAllowlist(filePath);
  const existing = new Set((allowlist.entries ?? []).map((entry) => `${entry.path}\u0000${entry.text}`));
  const nextEntries = [...(allowlist.entries ?? [])];

  for (const violation of violations) {
    const key = `${violation.path}\u0000${violation.text}`;
    if (existing.has(key)) continue;
    existing.add(key);
    nextEntries.push({
      path: violation.path,
      text: violation.text,
      reason: 'existing i18n migration backlog',
    });
  }

  nextEntries.sort((a, b) => `${a.path}\u0000${a.text}`.localeCompare(`${b.path}\u0000${b.text}`));
  const nextAllowlist = {
    ...allowlist,
    entries: nextEntries,
  };
  writeFileSync(filePath, `${JSON.stringify(nextAllowlist, null, 2)}\n`);
  return nextEntries.length - (allowlist.entries ?? []).length;
}

function runCli() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const violations = findHardcodedCopy({ root: options.root, allowlistPath: options.allowlist });
  if (options.updateAllowlist) {
    const added = updateAllowlist(options.allowlist, violations);
    console.log(`Updated hardcoded i18n allowlist: ${added} entr${added === 1 ? 'y' : 'ies'} added.`);
    return;
  }

  if (violations.length === 0) {
    console.log('OK hardcoded i18n copy check passed.');
    return;
  }

  console.error(`Hardcoded i18n copy found (${violations.length}):`);
  for (const item of violations.slice(0, 80)) {
    console.error(`  ${item.path}:${item.line} [${item.kind}] ${JSON.stringify(item.text)}`);
  }
  if (violations.length > 80) {
    console.error(`  ... and ${violations.length - 80} more`);
  }
  console.error('Move user-facing copy into src/i18n/locales/en.json and vi.json, or add a narrow allowlist entry for true non-translatable text.');
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
