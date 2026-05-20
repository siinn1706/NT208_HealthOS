/* eslint-env jest */
import { apiRequest, ApiError, getCoreApiBaseUrl, getCoreWsBaseUrl, buildQuery } from '../api/client';

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

jest.mock('../auth/session-store', () => ({
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  clearStoredSession: jest.fn().mockResolvedValue(undefined),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

function setDevMode(value: boolean) {
  Object.defineProperty(global, '__DEV__', { value, configurable: true });
}

beforeEach(() => {
  jest.clearAllMocks();
  setDevMode(true);
  delete process.env.EXPO_PUBLIC_CORE_API_URL;
  delete process.env.EXPO_PUBLIC_CORE_WS_URL;
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
    process.env.EXPO_PUBLIC_CORE_API_URL = 'http://localhost:8000/';
    expect(getCoreApiBaseUrl()).toBe('http://localhost:8000');
  });

  it('throws when production API URL is missing', () => {
    setDevMode(false);
    expect(() => getCoreApiBaseUrl()).toThrow('Missing EXPO_PUBLIC_CORE_API_URL');
  });

  it('throws when production API URL uses http://', () => {
    setDevMode(false);
    process.env.EXPO_PUBLIC_CORE_API_URL = 'http://core.internal';
    expect(() => getCoreApiBaseUrl()).toThrow('Production API URL must use HTTPS.');
  });
});

describe('getCoreWsBaseUrl', () => {
  it('strips trailing slash in dev', () => {
    process.env.EXPO_PUBLIC_CORE_WS_URL = 'ws://localhost:8000/';
    expect(getCoreWsBaseUrl()).toBe('ws://localhost:8000');
  });

  it('throws when production WS URL is missing', () => {
    setDevMode(false);
    expect(() => getCoreWsBaseUrl()).toThrow('Missing EXPO_PUBLIC_CORE_WS_URL');
  });

  it('throws when production WS URL uses ws://', () => {
    setDevMode(false);
    process.env.EXPO_PUBLIC_CORE_WS_URL = 'ws://core.internal/ws';
    expect(() => getCoreWsBaseUrl()).toThrow('Production WebSocket URL must use WSS.');
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
