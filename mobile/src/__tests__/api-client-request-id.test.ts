/* eslint-env jest */
import { apiRequest, createIdempotencyKey } from '../api/client';

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        EXPO_PUBLIC_BFF_URL: 'https://bff.test',
        EXPO_PUBLIC_WS_URL: 'wss://ws.test',
      },
    },
  },
}));

jest.mock('../auth/session-store', () => ({
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  clearStoredSession: jest.fn().mockResolvedValue(undefined),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
});

describe('X-Request-Id propagation in apiRequest', () => {
  it('attaches a uuid X-Request-Id when none provided', async () => {
    await apiRequest('/api/v1/health', {});
    const [, init] = mockFetch.mock.calls[0];
    const id = (init as RequestInit & { headers: Record<string, string> }).headers['X-Request-Id'];
    expect(id).toBeDefined();
    // createIdempotencyKey returns a UUID-like string (hex or uuid format)
    expect(id).toMatch(/^[0-9a-f-]{32,36}$/i);
  });

  it('passes through a caller-supplied X-Request-Id unchanged', async () => {
    const fixed = 'caller-supplied-request-id';
    await apiRequest('/api/v1/health', { headers: { 'X-Request-Id': fixed } });
    const [, init] = mockFetch.mock.calls[0];
    const id = (init as RequestInit & { headers: Record<string, string> }).headers['X-Request-Id'];
    expect(id).toBe(fixed);
  });

  it('generates distinct ids for parallel concurrent requests', async () => {
    const [r1, r2] = await Promise.all([
      apiRequest('/api/v1/health', {}),
      apiRequest('/api/v1/health', {}),
    ]);
    void r1; void r2;
    const id1 = (mockFetch.mock.calls[0][1] as RequestInit & { headers: Record<string, string> }).headers['X-Request-Id'];
    const id2 = (mockFetch.mock.calls[1][1] as RequestInit & { headers: Record<string, string> }).headers['X-Request-Id'];
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });

  it('accepts lowercase x-request-id as caller-supplied id', async () => {
    const fixed = 'lower-case-id';
    await apiRequest('/api/v1/health', { headers: { 'x-request-id': fixed } });
    const [, init] = mockFetch.mock.calls[0];
    const id = (init as RequestInit & { headers: Record<string, string> }).headers['X-Request-Id'];
    expect(id).toBe(fixed);
  });
});
