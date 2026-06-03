/* eslint-env jest */
import { ApiError } from '../api/client';
import {
  describeCoreApiTarget,
  ensureCoreReachable,
  toCoreReachabilityMessage,
} from '../api/core-reachability';

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

jest.mock('../auth/session-store', () => ({
  getAccessToken: jest.fn().mockResolvedValue(null),
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
  delete process.env.EXPO_PUBLIC_API_URL;
});

describe('describeCoreApiTarget', () => {
  it('classifies local mobile development hosts', () => {
    expect(describeCoreApiTarget('http://10.0.2.2:8000').hostKind).toBe('android-emulator');
    expect(describeCoreApiTarget('http://localhost:8000').hostKind).toBe('localhost');
    expect(describeCoreApiTarget('http://192.168.1.10:8000').hostKind).toBe('private-lan');
  });
});

describe('ensureCoreReachable', () => {
  it('checks the Core readiness route without auth', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.10:8000/';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ status: 'ok' }),
    });

    await ensureCoreReachable({ force: true });

    expect(mockFetch.mock.calls[0][0]).toBe('http://192.168.1.10:8000/api/v1/health');
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('turns network failures into actionable dev guidance', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.10:8000';
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const err = await ensureCoreReachable({ force: true }).catch((error: unknown) => error);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'CORE_UNREACHABLE' });
    expect((err as Error).message).toContain('Core unreachable at http://192.168.1.10:8000');
    expect((err as Error).message).toContain('start_FE.bat');
  });
});

describe('toCoreReachabilityMessage', () => {
  it('maps Core readiness failures to actionable dev guidance', () => {
    const message = toCoreReachabilityMessage(
      new ApiError('Request failed with status 503.', 503, 'REQUEST_FAILED', {
        status: 'degraded',
        db: 'error',
        redis: 'ok',
      }),
      'http://192.168.1.10:8000',
    );

    expect(message).toContain('Core is reachable at http://192.168.1.10:8000');
    expect(message).toContain('Readiness failed for db');
    expect(message).toContain('Check Postgres/Redis');
  });

  it('maps localhost dev failures to physical-device guidance', () => {
    const message = toCoreReachabilityMessage(
      new ApiError('Network request failed.', 0, 'NETWORK_ERROR'),
      'http://localhost:8000',
    );

    expect(message).toContain('Physical Expo Go cannot use localhost');
  });

  it('uses a generic production network message', () => {
    setDevMode(false);
    const message = toCoreReachabilityMessage(
      new ApiError('Request timed out.', 0, 'TIMEOUT'),
      'https://api.healthos.example.com',
    );

    expect(message).toBe('Core API is unreachable. Check your connection and try again.');
  });
});
