import { createRequire } from 'module';
import { basename } from 'path';

const require = createRequire(import.meta.url);
const { parseProjectEnv } = require('@expo/env');

export const ANDROID_PUBLIC_URL_KEYS = [
  'EXPO_PUBLIC_API_URL',       // canonical BFF URL
  'EXPO_PUBLIC_CORE_API_URL',  // DEPRECATED 2026-09-01 — use EXPO_PUBLIC_API_URL
  'EXPO_PUBLIC_WS_URL',
  'EXPO_PUBLIC_CORE_WS_URL',   // DEPRECATED 2026-09-01
  'EXPO_PUBLIC_WEB_APP_URL',
];

export const ANDROID_OPTIONAL_URL_KEYS = [];

const REQUIRED_URL_GROUPS = [
  {
    label: 'API URL',
    preferredKey: 'EXPO_PUBLIC_API_URL',
    keys: ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_CORE_API_URL'],
  },
  {
    label: 'WebSocket URL',
    preferredKey: 'EXPO_PUBLIC_WS_URL',
    keys: ['EXPO_PUBLIC_WS_URL', 'EXPO_PUBLIC_CORE_WS_URL'],
  },
  {
    label: 'Web app URL',
    preferredKey: 'EXPO_PUBLIC_WEB_APP_URL',
    keys: ['EXPO_PUBLIC_WEB_APP_URL'],
  },
];

const BLOCKED_PHYSICAL_HOSTS = new Set([
  '10.0.2.2',
  'localhost',
  '127.0.0.1',
  '::1',
  '::',
  '0.0.0.0',
]);

const EXPECTED_PROTOCOLS = {
  EXPO_PUBLIC_CORE_API_URL: new Set(['http:', 'https:']),  // DEPRECATED 2026-09-01
  EXPO_PUBLIC_API_URL: new Set(['http:', 'https:']),       // canonical BFF URL
  EXPO_PUBLIC_WS_URL: new Set(['ws:', 'wss:']),
  EXPO_PUBLIC_CORE_WS_URL: new Set(['ws:', 'wss:']),  // DEPRECATED 2026-09-01
  EXPO_PUBLIC_WEB_APP_URL: new Set(['http:', 'https:']),
};

function blockedHostReason(host) {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_PHYSICAL_HOSTS.has(normalized)) return 'uses an emulator-only, loopback, or wildcard host';
  return null;
}

export function isPhysicalAndroidDevice(device) {
  return Boolean(device?.state === 'device' && !String(device.id || '').startsWith('emulator-'));
}

export function resolveExpoPublicUrlValues({
  projectRoot,
  env = process.env,
}) {
  const values = new Map();

  const parsed = parseProjectEnv(projectRoot, {
    mode: env.NODE_ENV || 'development',
    silent: true,
    systemEnv: env,
  });
  const envFileSource = parsed.files.length
    ? `Expo env files: ${parsed.files.map((file) => basename(file)).join(', ')}`
    : 'Expo env files';
  for (const key of ANDROID_PUBLIC_URL_KEYS) {
    const value = parsed.env[key];
    if (typeof value === 'string') {
      values.set(key, { key, value, source: envFileSource });
    }
  }

  for (const key of ANDROID_PUBLIC_URL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(env, key)) {
      values.set(key, { key, value: String(env[key] ?? ''), source: 'process env' });
    }
  }
  return [...values.values()];
}

export function findPhysicalDeviceBlockedUrls(values) {
  return values.filter(({ value }) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    try {
      const host = new URL(trimmed).hostname.toLowerCase().replace(/^\[|\]$/g, '');
      return BLOCKED_PHYSICAL_HOSTS.has(host);
    } catch {
      return false;
    }
  });
}

export function findPhysicalDeviceInvalidUrls(values) {
  return values.flatMap((entry) => {
    const trimmed = entry.value.trim();
    if (!trimmed) return [];
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch {
      return [{ ...entry, reason: 'must be an absolute URL' }];
    }

    const expectedProtocols = EXPECTED_PROTOCOLS[entry.key];
    if (expectedProtocols && !expectedProtocols.has(parsed.protocol)) {
      return [{ ...entry, reason: `must use ${[...expectedProtocols].join(' or ')}` }];
    }

    const hostReason = blockedHostReason(parsed.hostname);
    if (hostReason) return [{ ...entry, reason: hostReason }];

    return [];
  });
}

export function findPhysicalDeviceMissingUrls(values) {
  const byKey = new Map(values.map((entry) => [entry.key, entry]));
  return REQUIRED_URL_GROUPS.flatMap((group) => {
    const configured = group.keys
      .map((key) => byKey.get(key))
      .find((entry) => entry?.value.trim());
    if (configured) return [];

    const preferred = byKey.get(group.preferredKey);
    if (preferred && !preferred.value.trim()) return [preferred];

    const blankLegacy = group.keys
      .map((key) => byKey.get(key))
      .find((entry) => entry && !entry.value.trim());
    if (blankLegacy) return [blankLegacy];

    return [{ key: group.preferredKey, value: '', source: 'not set' }];
  });
}

function resolveRequiredPhysicalDeviceUrls(values) {
  const byKey = new Map(values.map((entry) => [entry.key, entry]));
  return REQUIRED_URL_GROUPS.flatMap((group) => {
    const entry = group.keys
      .map((key) => byKey.get(key))
      .find((candidate) => candidate?.value.trim());
    if (!entry) return [];
    return [entry];
  });
}

function legacyGuidance(values) {
  const configuredKeys = new Set(values.filter((entry) => entry.value.trim()).map((entry) => entry.key));
  const hints = [];
  if (!configuredKeys.has('EXPO_PUBLIC_API_URL') && configuredKeys.has('EXPO_PUBLIC_CORE_API_URL')) {
    hints.push('EXPO_PUBLIC_CORE_API_URL is deprecated; prefer EXPO_PUBLIC_API_URL pointing at the BFF gateway.');
  }
  if (!configuredKeys.has('EXPO_PUBLIC_WS_URL') && configuredKeys.has('EXPO_PUBLIC_CORE_WS_URL')) {
    hints.push('EXPO_PUBLIC_CORE_WS_URL is deprecated; prefer EXPO_PUBLIC_WS_URL.');
  }
  return hints;
}

export function assertPhysicalDeviceReachableEnv({
  device,
  projectRoot,
  env = process.env,
}) {
  if (!isPhysicalAndroidDevice(device)) return;

  const values = resolveExpoPublicUrlValues({
    projectRoot,
    env,
  });
  const missing = findPhysicalDeviceMissingUrls(values);
  const invalid = findPhysicalDeviceInvalidUrls(resolveRequiredPhysicalDeviceUrls(values));
  if (missing.length === 0 && invalid.length === 0) return;

  const details = [
    ...legacyGuidance(values).map((hint) => `- ${hint}`),
    ...missing.map(({ key, source }) => `- ${key} is blank or missing (${source})`),
    ...invalid.map(({ key, value, source, reason }) => `- ${key}=${value} (${source}) ${reason}`),
  ].join('\n');

  throw new Error([
    `Physical Android device ${device.id} needs explicit LAN Expo public URLs.`,
    details,
    'Blank values can fall back to emulator-only 10.0.2.2 when Expo LAN metadata is unavailable.',
    'Set these mobile env values to this computer LAN IP before launching a physical device.',
    'Example: EXPO_PUBLIC_API_URL=http://192.168.x.x:3000, EXPO_PUBLIC_WS_URL=ws://192.168.x.x:8000, EXPO_PUBLIC_WEB_APP_URL=http://192.168.x.x:3000.',
  ].join('\n'));
}
