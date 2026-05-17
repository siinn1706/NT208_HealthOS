import { apiRequest, ApiError, getCoreApiBaseUrl, buildQuery } from '../api/client';

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

jest.mock('../auth/session-store', () => ({
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  clearStoredSession: jest.fn().mockResolvedValue(undefined),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
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
  it('strips trailing slash', () => {
    process.env.EXPO_PUBLIC_CORE_API_URL = 'http://localhost:8000/';
    expect(getCoreApiBaseUrl()).toBe('http://localhost:8000');
    delete process.env.EXPO_PUBLIC_CORE_API_URL;
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
});
