import Constants from 'expo-constants';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? value as UnknownRecord : null;
}

function readStringAtPath(root: unknown, path: string[]): string | null {
  let current: unknown = root;
  for (const segment of path) {
    const record = asRecord(current);
    if (!record) return null;
    current = record[segment];
  }
  return typeof current === 'string' && current.trim() ? current : null;
}

function parseHostCandidate(candidate: string): string | null {
  const trimmed = candidate.trim();
  const value = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export function isPrivateLanHost(host: string): boolean {
  const normalized = host.trim().replace(/^\[|\]$/g, '');
  return /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(normalized);
}

export function resolveExpoDevLanHost(constantsValue: unknown = Constants): string | null {
  const candidates = [
    readStringAtPath(constantsValue, ['expoConfig', 'hostUri']),
    readStringAtPath(constantsValue, ['expoGoConfig', 'debuggerHost']),
    readStringAtPath(constantsValue, ['expoGoConfig', 'hostUri']),
    readStringAtPath(constantsValue, ['manifest', 'debuggerHost']),
    readStringAtPath(constantsValue, ['manifest', 'hostUri']),
    readStringAtPath(constantsValue, ['manifest2', 'extra', 'expoClient', 'hostUri']),
    readStringAtPath(constantsValue, ['linkingUri']),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const host = parseHostCandidate(candidate);
    if (host && isPrivateLanHost(host)) return host;
  }

  return null;
}

export function buildExpoDevLanBaseUrl(scheme: 'http' | 'ws', port: number): string | null {
  const host = resolveExpoDevLanHost();
  return host ? `${scheme}://${host}:${port}` : null;
}

export function buildExpoDevLanBaseUrlForPlatform(
  scheme: 'http' | 'ws',
  port: number,
  platformOS: string,
): string | null {
  // Android emulator reaches the host machine through 10.0.2.2. Expo can still
  // expose the Metro LAN host, but using that host here makes emulator auth
  // depend on Windows firewall/LAN reachability and breaks local dev sign-in.
  if (platformOS === 'android') return null;
  return buildExpoDevLanBaseUrl(scheme, port);
}
