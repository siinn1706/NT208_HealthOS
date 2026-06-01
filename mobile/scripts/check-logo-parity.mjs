#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(mobileRoot, '..');
const require = createRequire(import.meta.url);

const webLogoPath = path.join(repoRoot, 'frontend/public/logo.svg');
const mobileBrandPath = path.join(mobileRoot, 'src/components/brand/healthos-brand-mark.tsx');
const createExpoConfig = require(path.join(mobileRoot, 'app.config.js'));

const expectedAssetRefs = {
  icon: './assets/icons/icon.png',
  adaptiveIcon: './assets/icons/adaptive-icon.png',
  splash: './assets/icons/splash.png',
  splashPlugin: './assets/icons/splash.png',
};

const expectedPngDimensions = {
  'assets/icons/icon.png': [1024, 1024],
  'assets/icons/adaptive-icon.png': [1024, 1024],
  'assets/icons/splash.png': [1242, 2436],
  'assets/icons/favicon.png': [48, 48],
};

function fail(message) {
  console.error(`Logo parity check failed: ${message}`);
  process.exitCode = 1;
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function normalizePathData(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeWhitespace(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeColor(value) {
  const valueMap = { '#fff': '#ffffff' };
  const normalized = value.trim().toLowerCase();
  return valueMap[normalized] ?? normalized;
}

function normalizeNumber(value) {
  const parsed = Number.parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? String(parsed) : String(value).trim();
}

function readAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1] ?? null;
}

function readJsxAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1]
    ?? tag.match(new RegExp(`\\b${name}=\\{([^}]+)\\}`))?.[1]
    ?? null;
}

function extractWebClassStyles(svg) {
  const styles = new Map();
  for (const match of svg.matchAll(/\.([\w-]+)\s*\{([^}]+)\}/g)) {
    const declarations = Object.fromEntries(
      match[2]
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => entry.split(':').map((part) => part.trim())),
    );
    styles.set(match[1], declarations);
  }
  return styles;
}

function normalizeFill(value, gradientIds) {
  const fill = value?.trim() ?? '';
  const gradientId = fill.match(/^url\(#([^)]+)\)$/)?.[1];
  if (gradientId) return `gradient-${gradientIds.indexOf(gradientId)}`;
  return normalizeColor(fill);
}

function extractWebGradients(svg) {
  return [...svg.matchAll(/<linearGradient\b([^>]*)>([\s\S]*?)<\/linearGradient>/g)].map((match) => ({
    x1: normalizeNumber(readAttribute(match[1], 'x1')),
    y1: normalizeNumber(readAttribute(match[1], 'y1')),
    x2: normalizeNumber(readAttribute(match[1], 'x2')),
    y2: normalizeNumber(readAttribute(match[1], 'y2')),
    gradientUnits: readAttribute(match[1], 'gradientUnits') ?? '',
    stops: [...match[2].matchAll(/<stop\b([^>]*)\/>/g)].map((stop) => ({
      offset: normalizeNumber(readAttribute(stop[1], 'offset')),
      color: normalizeColor(readAttribute(stop[1], 'stop-color')),
    })),
  }));
}

function extractMobileGradients(source) {
  return [...source.matchAll(/<LinearGradient\b([^>]*)>([\s\S]*?)<\/LinearGradient>/g)].map((match) => ({
    x1: normalizeNumber(readJsxAttribute(match[1], 'x1')),
    y1: normalizeNumber(readJsxAttribute(match[1], 'y1')),
    x2: normalizeNumber(readJsxAttribute(match[1], 'x2')),
    y2: normalizeNumber(readJsxAttribute(match[1], 'y2')),
    gradientUnits: readJsxAttribute(match[1], 'gradientUnits') ?? '',
    stops: [...match[2].matchAll(/<Stop\b([^>]*)\/>/g)].map((stop) => ({
      offset: normalizeNumber(readJsxAttribute(stop[1], 'offset')),
      color: normalizeColor(readJsxAttribute(stop[1], 'stopColor')),
    })),
  }));
}

function extractWebPathRecords(svg) {
  const classStyles = extractWebClassStyles(svg);
  const gradientIds = [...svg.matchAll(/<linearGradient\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
  return [...svg.matchAll(/<path\b([^>]*)\/>/g)].map((match) => {
    const className = readAttribute(match[1], 'class');
    const style = className ? classStyles.get(className) ?? {} : {};
    return {
      d: normalizePathData(readAttribute(match[1], 'd')),
      fill: normalizeFill(style.fill ?? readAttribute(match[1], 'fill'), gradientIds),
      opacity: normalizeNumber(style.opacity ?? readAttribute(match[1], 'opacity') ?? '1'),
    };
  });
}

function extractMobilePathRecords(source) {
  const gradientIds = [...source.matchAll(/<LinearGradient\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
  return [...source.matchAll(/<Path\b([\s\S]*?)\/>/g)].map((match) => ({
    d: normalizePathData(readJsxAttribute(match[1], 'd')),
    fill: normalizeFill(readJsxAttribute(match[1], 'fill'), gradientIds),
    opacity: normalizeNumber(readJsxAttribute(match[1], 'opacity') ?? '1'),
  }));
}

function extractWebViewBox(svg) {
  const svgTag = svg.match(/<svg\b([^>]*)>/)?.[1] ?? '';
  return normalizeWhitespace(readAttribute(svgTag, 'viewBox'));
}

function extractMobileViewBox(source) {
  const svgTag = source.match(/<Svg\b([^>]*)>/)?.[1] ?? '';
  return normalizeWhitespace(readJsxAttribute(svgTag, 'viewBox'));
}

function assertEqual(name, actual, expected) {
  if (actual !== expected) {
    fail(`${name} differs from web logo source`);
  }
}

function assertArrayEqual(name, actual, expected) {
  if (actual.length !== expected.length) {
    fail(`${name} count differs: expected ${expected.length}, got ${actual.length}`);
    return;
  }
  actual.forEach((value, index) => {
    if (JSON.stringify(value) !== JSON.stringify(expected[index])) {
      fail(`${name}[${index}] differs from web logo source`);
    }
  });
}

function readPngDimensions(file) {
  const buffer = fs.readFileSync(file);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`${path.relative(mobileRoot, file)} is not a PNG`);
  }
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

function assertPngDimensions(relativePath, expected) {
  const absolutePath = path.join(mobileRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`missing PNG asset ${relativePath}`);
    return;
  }
  let width;
  let height;
  try {
    [width, height] = readPngDimensions(absolutePath);
  } catch (error) {
    fail(`${relativePath} could not be read as a PNG: ${error.message}`);
    return;
  }
  if (width !== expected[0] || height !== expected[1]) {
    fail(`${relativePath} dimensions ${width}x${height}; expected ${expected[0]}x${expected[1]}`);
  }
}

function readExpoConfig() {
  return createExpoConfig({ config: {} });
}

function getPluginConfig(config, pluginName) {
  return (config.plugins ?? []).find((plugin) => Array.isArray(plugin) && plugin[0] === pluginName)?.[1] ?? null;
}

function assertExpoAssetRefs(config) {
  if (config.icon !== expectedAssetRefs.icon) {
    fail(`app.json icon must be ${expectedAssetRefs.icon}`);
  }
  if (config.android?.adaptiveIcon?.foregroundImage !== expectedAssetRefs.adaptiveIcon) {
    fail(`app.json adaptive icon foreground must be ${expectedAssetRefs.adaptiveIcon}`);
  }
  if (config.splash?.image !== expectedAssetRefs.splash) {
    fail(`app.json splash image must be ${expectedAssetRefs.splash}`);
  }
  const splashPlugin = getPluginConfig(config, 'expo-splash-screen');
  if (splashPlugin?.image !== expectedAssetRefs.splashPlugin) {
    fail(`expo-splash-screen image must be ${expectedAssetRefs.splashPlugin}`);
  }
}

function main() {
  const webLogo = readText(webLogoPath);
  const mobileBrand = readText(mobileBrandPath);

  assertEqual('brand viewBox', extractMobileViewBox(mobileBrand), extractWebViewBox(webLogo));
  assertArrayEqual('brand path record', extractMobilePathRecords(mobileBrand), extractWebPathRecords(webLogo));
  assertArrayEqual('gradient record', extractMobileGradients(mobileBrand), extractWebGradients(webLogo));
  assertExpoAssetRefs(readExpoConfig());

  for (const [relativePath, dimensions] of Object.entries(expectedPngDimensions)) {
    assertPngDimensions(relativePath, dimensions);
  }

  if (!process.exitCode) {
    console.log('Logo parity check passed.');
  }
}

main();
