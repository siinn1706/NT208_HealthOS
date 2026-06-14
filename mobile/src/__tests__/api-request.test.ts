/* eslint-env jest */
import {
  apiRequest,
  ApiError,
  getCoreApiBaseUrl,
  getBffApiBaseUrl,
  getCoreWsBaseUrl,
  getWebSocketBaseUrl,
  buildQuery,
  createIdempotencyKey,
  setRefreshHandler,
  setUnauthorizedHandler,
} from '../api/client';
import Constants from 'expo-constants';
import { clearStoredSession } from '../auth/session-store';
import { Platform } from 'react-native';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: {} },
    expoGoConfig: {},
    manifest: {},
    manifest2: {},
    linkingUri: undefined,
  },
}));

jest.mock('../auth/session-store', () => ({
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  clearStoredSession: jest.fn().mockResolvedValue(undefined),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;
const defaultPlatformOS = Platform.OS;
const mockExpoConstants = Constants as unknown as {
  expoConfig: { extra: Record<string, string | undefined>; hostUri?: string };
  expoGoConfig: Record<string, string | undefined>;
  manifest: Record<string, string | undefined>;
  manifest2: Record<string, unknown>;
  linkingUri?: string;
};

function setDevMode(value: boolean) {
  Object.defineProperty(global, '__DEV__', { value, configurable: true });
}

function setPlatformOS(value: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, value });
}

beforeEach(() => {
  jest.clearAllMocks();
  setRefreshHandler(null);
  setUnauthorizedHandler(null);
  setDevMode(true);
  setPlatformOS(defaultPlatformOS);
  mockExpoConstants.expoConfig = { extra: {}, hostUri: undefined };
  mockExpoConstants.expoGoConfig = {};
  mockExpoConstants.manifest = {};
  mockExpoConstants.manifest2 = {};
  mockExpoConstants.linkingUri = undefined;
  delete process.env.EXPO_PUBLIC_API_URL;
  delete process.env.EXPO_PUBLIC_CORE_API_URL;
  delete process.env.EXPO_PUBLIC_CORE_WS_URL;
  delete process.env.EXPO_PUBLIC_WS_URL;
});

describe('createIdempotencyKey', () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const originalCrypto = globalThis.crypto;

  it('returns a valid v4 UUID', () => {
    expect(createIdempotencyKey()).toMatch(UUID_RE);
  });

  it('produces unique values on each call', () => {
    const keys = new Set(Array.from({ length: 20 }, () => createIdempotencyKey()));
    expect(keys.size).toBe(20);
  });

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues: (bytes: Uint8Array) => {
          bytes.fill(0x11);
          return bytes;
        },
      },
    });

    expect(createIdempotencyKey()).toBe('11111111-1111-4111-9111-111111111111');

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
  });
});

describe('buildQuery', () => {
  it('returns empty string when all values undefined', () => {
    expect(buildQuery({ a: undefined, b: null })).toBe('');
  });

  it('serialises defined values', () => {
    expect(buildQuery({ page: 1, only_unread: true })).toBe('?page=1&only_unread=true');
  });

  it('omits empty string values', () => {
    expect(buildQuery({ q: '' })).toBe('');
  });
});

describe('getCoreApiBaseUrl', () => {
  it('strips trailing slash in dev', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000/';
    expect(getCoreApiBaseUrl()).toBe('http://localhost:8000');
  });

  it('keeps explicit dev API config ahead of Expo LAN host metadata', () => {
    setPlatformOS('android');
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000/';
    mockExpoConstants.expoConfig.hostUri = '192.168.1.10:8081';

    expect(getCoreApiBaseUrl()).toBe('http://10.0.2.2:8000');
  });

  it('normalizes legacy EXPO_PUBLIC_CORE_API_URL for mobile BFF hosting', () => {
    process.env.EXPO_PUBLIC_CORE_API_URL = 'http://legacy-api.local:8000/';
    expect(getCoreApiBaseUrl()).toBe('http://legacy-api.local:3000');
  });

  it('normalizes legacy EXPO_PUBLIC_CORE_API_URL path for BFF base URL', () => {
    process.env.EXPO_PUBLIC_CORE_API_URL = 'http://legacy-api.local:8000/api/v1/';
    expect(getCoreApiBaseUrl()).toBe('http://legacy-api.local:3000');
  });

  it('keeps Android dev API fallback on emulator host even when Expo LAN host metadata exists', () => {
    setPlatformOS('android');
    mockExpoConstants.expoConfig.hostUri = '192.168.1.10:8081';

    expect(getCoreApiBaseUrl()).toBe('http://10.0.2.2:3000');
  });

  it('derives dev API fallback from the Expo LAN host for non-Android dev targets', () => {
    setPlatformOS('ios');
    mockExpoConstants.expoConfig.hostUri = '192.168.1.10:8081';

    expect(getCoreApiBaseUrl()).toBe('http://192.168.1.10:3000');
  });

  it('keeps the Android emulator API fallback when no LAN host metadata exists', () => {
    setPlatformOS('android');
    mockExpoConstants.expoConfig.hostUri = 'localhost:8081';

    expect(getCoreApiBaseUrl()).toBe('http://10.0.2.2:3000');
  });

  it('throws when production API URL is missing', () => {
    setDevMode(false);
    expect(() => getCoreApiBaseUrl()).toThrow('Missing EXPO_PUBLIC_API_URL');
  });

  it('throws when production API URL uses http://', () => {
    setDevMode(false);
    process.env.EXPO_PUBLIC_API_URL = 'http://core.internal';
    expect(() => getCoreApiBaseUrl()).toThrow('Production API URL must use HTTPS.');
  });

  it('throws when production API URL is not absolute HTTPS', () => {
    setDevMode(false);
    process.env.EXPO_PUBLIC_API_URL = 'api.healthos.example.com';
    expect(() => getCoreApiBaseUrl()).toThrow('Production API URL must be an absolute HTTPS URL.');

    process.env.EXPO_PUBLIC_API_URL = 'ftp://api.healthos.example.com';
    expect(() => getCoreApiBaseUrl()).toThrow('Production API URL must use HTTPS.');
  });
});

describe('getBffApiBaseUrl (canonical name)', () => {
  it('returns the same value as the deprecated getCoreApiBaseUrl alias', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
    expect(getBffApiBaseUrl()).toBe(getCoreApiBaseUrl());
  });

  it('warns once per session when legacy env var is used', () => {
    process.env.EXPO_PUBLIC_CORE_API_URL = 'http://legacy.local:8000';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Use isolateModules to get a fresh module instance so hasWarnedLegacy starts false.
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getBffApiBaseUrl: freshFn } = require('../api/client') as { getBffApiBaseUrl: () => string };
      freshFn(); // should warn
      freshFn(); // should NOT warn again
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('EXPO_PUBLIC_CORE_API_URL is deprecated'));
    });

    warnSpy.mockRestore();
  });
});

describe('getWebSocketBaseUrl', () => {
  it('strips trailing slash in dev (new key)', () => {
    process.env.EXPO_PUBLIC_WS_URL = 'ws://localhost:8000/';
    expect(getWebSocketBaseUrl()).toBe('ws://localhost:8000');
  });

  it('prefers new EXPO_PUBLIC_WS_URL over legacy EXPO_PUBLIC_CORE_WS_URL', () => {
    process.env.EXPO_PUBLIC_WS_URL = 'ws://10.0.2.2:8000/';
    process.env.EXPO_PUBLIC_CORE_WS_URL = 'ws://legacy.local:8000';
    expect(getWebSocketBaseUrl()).toBe('ws://10.0.2.2:8000');
  });

  it('keeps Android dev WS fallback on emulator host even when Expo LAN host metadata exists', () => {
    setPlatformOS('android');
    mockExpoConstants.expoGoConfig.debuggerHost = '192.168.1.11:8081';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getWebSocketBaseUrl()).toBe('ws://10.0.2.2:8000');

    warnSpy.mockRestore();
  });

  it('derives dev WS fallback from Expo Go debugger host metadata for non-Android dev targets', () => {
    setPlatformOS('ios');
    mockExpoConstants.expoGoConfig.debuggerHost = '192.168.1.11:8081';

    expect(getWebSocketBaseUrl()).toBe('ws://192.168.1.11:8000');
  });

  it('keeps explicit dev WS config ahead of Expo LAN host metadata', () => {
    setPlatformOS('android');
    process.env.EXPO_PUBLIC_WS_URL = 'ws://10.0.2.2:8000/';
    mockExpoConstants.expoGoConfig.debuggerHost = '192.168.1.11:8081';

    expect(getWebSocketBaseUrl()).toBe('ws://10.0.2.2:8000');
  });

  it('throws when production WS URL is missing', () => {
    setDevMode(false);
    expect(() => getWebSocketBaseUrl()).toThrow('Missing EXPO_PUBLIC_WS_URL');
  });

  it('throws when production WS URL uses ws://', () => {
    setDevMode(false);
    process.env.EXPO_PUBLIC_WS_URL = 'ws://core.internal/ws';
    expect(() => getWebSocketBaseUrl()).toThrow('Production WebSocket URL must use WSS.');
  });

  it('throws when production WS URL is not absolute WSS', () => {
    setDevMode(false);
    process.env.EXPO_PUBLIC_WS_URL = 'api.healthos.example.com/ws';
    expect(() => getWebSocketBaseUrl()).toThrow('Production WebSocket URL must be an absolute WSS URL.');

    process.env.EXPO_PUBLIC_WS_URL = 'https://api.healthos.example.com/ws';
    expect(() => getWebSocketBaseUrl()).toThrow('Production WebSocket URL must use WSS.');
  });
});

describe('getCoreWsBaseUrl (deprecated alias)', () => {
  it('is the same function as getWebSocketBaseUrl', () => {
    process.env.EXPO_PUBLIC_WS_URL = 'ws://localhost:8000/';
    expect(getCoreWsBaseUrl()).toBe(getWebSocketBaseUrl());
  });
});

describe('apiRequest', () => {
  it('returns parsed JSON on 200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { id: '1' } }),
    });
    const result = await apiRequest<{ data: { id: string } }>('/v1/test');
    expect(result).toEqual({ data: { id: '1' } });
  });

  it('returns undefined on 204', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, headers: { get: () => '' } });
    const result = await apiRequest('/v1/test');
    expect(result).toBeUndefined();
  });

  it('throws ApiError with status on non-ok response', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: { message: 'Not found', code: 'NOT_FOUND' } }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);
    const err = await apiRequest('/v1/missing').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('throws ApiError with NETWORK_ERROR on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(apiRequest('/v1/test')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('attaches Authorization header when token available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    });
    await apiRequest('/v1/test');
    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer mock-token');
  });

  it('clears session and calls unauthorized handler when refresh fails', async () => {
    const refreshHandler = jest.fn().mockResolvedValue(false);
    const unauthorizedHandler = jest.fn();
    setRefreshHandler(refreshHandler);
    setUnauthorizedHandler(unauthorizedHandler);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: { message: 'Expired', code: 'AUTH_INVALID_TOKEN' } }),
    });

    await expect(apiRequest('/v1/private')).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_INVALID_TOKEN',
    });

    expect(refreshHandler).toHaveBeenCalledTimes(1);
    expect(clearStoredSession).toHaveBeenCalledTimes(1);
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });

  it('does not recurse when the refresh request itself returns 401', async () => {
    const unauthorizedHandler = jest.fn();
    const refreshHandler = jest.fn(async () => {
      await apiRequest('/v1/auth/refresh', { method: 'POST', auth: false, json: { refresh_token: 'rt' } });
      return true;
    });
    setRefreshHandler(refreshHandler);
    setUnauthorizedHandler(unauthorizedHandler);
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: { message: 'Expired', code: 'AUTH_INVALID_TOKEN' } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: { message: 'Refresh expired', code: 'AUTH_REFRESH_INVALID' } }),
      });

    await expect(apiRequest('/v1/private')).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_INVALID_TOKEN',
    });

    expect(refreshHandler).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(clearStoredSession).toHaveBeenCalledTimes(1);
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });

  it('skips Authorization header when auth:false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    });
    await apiRequest('/v1/test', { auth: false });
    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('sends FormData bodies without overriding multipart Content-Type', async () => {
    const form = { _parts: [] } as unknown as FormData;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { ok: true } }),
    });

    await apiRequest('/v1/upload', { method: 'POST', body: form } as any);

    const request = mockFetch.mock.calls[0][1];
    const headers = request.headers as Record<string, string>;
    expect(request.body).toBe(form);
    expect(headers['Content-Type']).toBeUndefined();
  });
});
