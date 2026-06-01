import { ApiError, apiRequest, getCoreApiBaseUrl } from './client';

export const CORE_REACHABILITY_TIMEOUT_MS = 3000;
export const AUTH_REQUEST_TIMEOUT_MS = 8000;
export const BOOTSTRAP_PROFILE_TIMEOUT_MS = 5000;

const REACHABILITY_CACHE_MS = 10000;
const NETWORK_ERROR_CODES = new Set(['NETWORK_ERROR', 'TIMEOUT']);
const READINESS_ERROR_STATUS = 503;

type CoreHostKind = 'android-emulator' | 'localhost' | 'private-lan' | 'remote' | 'invalid';

interface CoreApiTarget {
  baseUrl: string;
  hostKind: CoreHostKind;
}

interface ReachabilityCache {
  baseUrl: string;
  okUntil: number;
}

interface CoreReachabilityOptions {
  timeoutMs?: number;
  force?: boolean;
}

let reachabilityCache: ReachabilityCache | null = null;

export function describeCoreApiTarget(baseUrl = getCoreApiBaseUrl()): CoreApiTarget {
  try {
    const parsed = new URL(baseUrl);
    const host = parsed.hostname;
    if (host === '10.0.2.2') return { baseUrl, hostKind: 'android-emulator' };
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return { baseUrl, hostKind: 'localhost' };
    }
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) {
      return { baseUrl, hostKind: 'private-lan' };
    }
    return { baseUrl, hostKind: 'remote' };
  } catch {
    return { baseUrl, hostKind: 'invalid' };
  }
}

export function toCoreReachabilityMessage(error: unknown, baseUrl?: string): string | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'CORE_UNREACHABLE') return error.message;
  if (error.code === 'CORE_API_URL_MISSING' || error.code === 'INSECURE_API_URL') {
    return error.message;
  }
  if (error.status === READINESS_ERROR_STATUS) {
    if (!__DEV__) {
      return 'Core API is temporarily unavailable. Please try again later.';
    }
    const target = describeCoreApiTarget(baseUrl);
    const failed = getFailedReadinessChecks(error.details);
    const suffix = failed.length
      ? ` Readiness failed for ${failed.join(', ')}.`
      : '';
    return `Core is reachable at ${target.baseUrl}, but it is not ready.${suffix} Check Postgres/Redis and restart Core before signing in.`;
  }
  if (error.status !== 0 || !NETWORK_ERROR_CODES.has(error.code)) return null;

  const target = describeCoreApiTarget(baseUrl);
  if (!__DEV__) {
    return 'Core API is unreachable. Check your connection and try again.';
  }
  return `Core unreachable at ${target.baseUrl}. ${getDevReachabilityGuidance(target.hostKind)}`;
}

export async function ensureCoreReachable(options: CoreReachabilityOptions = {}): Promise<void> {
  const baseUrl = getCoreApiBaseUrl();
  const now = Date.now();
  if (
    !options.force
    && reachabilityCache?.baseUrl === baseUrl
    && reachabilityCache.okUntil > now
  ) {
    return;
  }

  try {
    await apiRequest('/health/ready', {
      auth: false,
      timeoutMs: options.timeoutMs ?? CORE_REACHABILITY_TIMEOUT_MS,
    });
    reachabilityCache = { baseUrl, okUntil: Date.now() + REACHABILITY_CACHE_MS };
  } catch (error) {
    const message = toCoreReachabilityMessage(error, baseUrl);
    if (!message) throw error;
    throw new ApiError(message, 0, 'CORE_UNREACHABLE', {
      baseUrl,
      causeCode: error instanceof ApiError ? error.code : 'UNKNOWN',
    });
  }
}

function getFailedReadinessChecks(details: unknown): string[] {
  if (!details || typeof details !== 'object') return [];
  const obj = details as Record<string, unknown>;
  return ['db', 'redis'].filter((key) => obj[key] === 'error');
}

function getDevReachabilityGuidance(hostKind: CoreHostKind): string {
  switch (hostKind) {
    case 'android-emulator':
      return '10.0.2.2 works only for Android emulator; physical Expo Go needs this computer LAN IP.';
    case 'localhost':
      return 'Physical Expo Go cannot use localhost; set EXPO_PUBLIC_CORE_API_URL to http://<computer-lan-ip>:8000.';
    case 'private-lan':
      return 'Verify the phone and computer share the LAN, Windows firewall allows port 8000, and BE started with start_BE.bat -Host 0.0.0.0.';
    case 'invalid':
      return 'Check EXPO_PUBLIC_CORE_API_URL format and restart Expo after editing mobile/.env.';
    default:
      return 'Verify the Core host is reachable from this device before signing in.';
  }
}
