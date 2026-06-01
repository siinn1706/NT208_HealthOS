/* eslint-env jest */
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import {
  authService,
  buildMobileOAuthStartUrl,
  createMobileOAuthCodeChallenge,
  createMobileOAuthState,
  createMobileOAuthVerifier,
  getMobileOAuthRedirectUri,
  parseMobileOAuthCallbackUrl,
} from '../api/services/auth-service';
import { ApiError, apiRequest } from '../api/client';
import { AUTH_REQUEST_TIMEOUT_MS, ensureCoreReachable, toCoreReachabilityMessage } from '../api/core-reachability';
import { clearStoredSession, getRefreshToken, saveAuthToken } from '../auth/session-store';
import { Platform } from 'react-native';
import type { AuthLoginResult, AuthToken, DataResponse } from '../types/api';

jest.mock('../api/client', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    details?: unknown;

    constructor(message: string, status = 0, code = 'REQUEST_FAILED', details?: unknown) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
      this.details = details;
    }
  },
  apiRequest: jest.fn(),
}));
jest.mock('../api/core-reachability', () => ({
  AUTH_REQUEST_TIMEOUT_MS: 8000,
  ensureCoreReachable: jest.fn(),
  toCoreReachabilityMessage: jest.fn(),
}));
jest.mock('../auth/session-store', () => ({
  saveAuthToken: jest.fn(),
  clearStoredSession: jest.fn(),
  getRefreshToken: jest.fn(),
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: {} },
    expoGoConfig: {},
  },
}));
jest.mock('expo-linking', () => ({
  parse: jest.fn((url: string) => {
    const parsed = new URL(url);
    return { queryParams: Object.fromEntries(parsed.searchParams.entries()) };
  }),
}));
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
  digestStringAsync: jest.fn(),
  getRandomValues: jest.fn(),
}));
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockEnsureCoreReachable = ensureCoreReachable as jest.MockedFunction<typeof ensureCoreReachable>;
const mockToCoreReachabilityMessage = toCoreReachabilityMessage as jest.MockedFunction<typeof toCoreReachabilityMessage>;
const mockSaveAuthToken = saveAuthToken as jest.MockedFunction<typeof saveAuthToken>;
const mockClearStoredSession = clearStoredSession as jest.MockedFunction<typeof clearStoredSession>;
const mockGetRefreshToken = getRefreshToken as jest.MockedFunction<typeof getRefreshToken>;
const mockOpenAuthSessionAsync = WebBrowser.openAuthSessionAsync as jest.MockedFunction<typeof WebBrowser.openAuthSessionAsync>;
const mockDigestStringAsync = jest.requireMock('expo-crypto').digestStringAsync as jest.MockedFunction<(algorithm: string, data: string) => Promise<string>>;
const mockGetRandomValues = jest.requireMock('expo-crypto').getRandomValues as jest.MockedFunction<(bytes: Uint8Array) => Uint8Array>;
const mockExpoConstants = Constants as unknown as {
  expoConfig: { extra: Record<string, string | undefined>; hostUri?: string };
  expoGoConfig: Record<string, string | undefined>;
};
const validState = 'a'.repeat(64);
const validChallenge = 'c'.repeat(64);
const generatedState = '11'.repeat(32);
const generatedVerifier = '22'.repeat(32);
const generatedChallenge = '44'.repeat(32);

const mockToken: AuthToken = {
  access_token: 'tok',
  token_type: 'bearer',
  user_id: 'u1',
  email: 'a@b.com',
  username: null,
  display_name: 'A',
  avatar_url: null,
  onboarding_status: 'complete',
};

beforeEach(() => {
  jest.clearAllMocks();
  (Platform as unknown as { OS: string }).OS = 'android';
  setDevMode(true);
  mockExpoConstants.expoConfig = { extra: {}, hostUri: undefined };
  mockExpoConstants.expoGoConfig = {};
  delete process.env.EXPO_PUBLIC_WEB_APP_URL;
  delete process.env.EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI;
  mockEnsureCoreReachable.mockResolvedValue(undefined);
  mockToCoreReachabilityMessage.mockReturnValue(null);
  mockDigestStringAsync.mockResolvedValue(generatedChallenge);
  let randomCalls = 0;
  mockGetRandomValues.mockImplementation((bytes: Uint8Array) => {
    randomCalls += 1;
    bytes.fill(randomCalls === 1 ? 0x11 : 0x22);
    return bytes;
  });
});

function setDevMode(value: boolean) {
  Object.defineProperty(global, '__DEV__', { value, configurable: true });
}

describe('mobile OAuth helpers', () => {
  it('uses the custom-scheme redirect URI by default', () => {
    expect(getMobileOAuthRedirectUri()).toBe('nt208://auth/oauth/callback');
  });

  it('uses a configured HTTPS App Link redirect URI for mobile OAuth', () => {
    process.env.EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI = 'https://app.example.com/auth/oauth/mobile-callback?ignored=1#hash';

    expect(getMobileOAuthRedirectUri()).toBe('https://app.example.com/auth/oauth/mobile-callback');
    expect(buildMobileOAuthStartUrl('google', validState, validChallenge)).toBe(
      `http://10.0.2.2:3000/api/v1/auth/oauth/google?mobile_redirect_uri=https%3A%2F%2Fapp.example.com%2Fauth%2Foauth%2Fmobile-callback&mobile_state=${validState}&mobile_code_challenge=${validChallenge}`,
    );
  });

  it('keeps non-Android OAuth on the custom scheme when an Android App Link is configured', () => {
    (Platform as unknown as { OS: string }).OS = 'ios';
    process.env.EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI = 'https://app.example.com/auth/oauth/mobile-callback';

    expect(getMobileOAuthRedirectUri()).toBe('nt208://auth/oauth/callback');
  });

  it('rejects malformed mobile OAuth redirect URI configuration', () => {
    process.env.EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI = 'http://app.example.com/auth/oauth/mobile-callback';

    expect(() => getMobileOAuthRedirectUri()).toThrow('Mobile OAuth App Link redirect URI must use production HTTPS.');
  });

  it('builds provider start URLs against the configured BFF origin', () => {
    process.env.EXPO_PUBLIC_WEB_APP_URL = 'http://localhost:3000/';

    expect(buildMobileOAuthStartUrl('google', validState, validChallenge)).toBe(
      `http://localhost:3000/api/v1/auth/oauth/google?mobile_redirect_uri=nt208%3A%2F%2Fauth%2Foauth%2Fcallback&mobile_state=${validState}&mobile_code_challenge=${validChallenge}`,
    );
  });

  it('uses app config BFF origin when mobile env is absent', () => {
    mockExpoConstants.expoConfig.extra.webAppUrl = 'http://192.168.1.20:3000/';

    expect(buildMobileOAuthStartUrl('google', validState, validChallenge)).toBe(
      `http://192.168.1.20:3000/api/v1/auth/oauth/google?mobile_redirect_uri=nt208%3A%2F%2Fauth%2Foauth%2Fcallback&mobile_state=${validState}&mobile_code_challenge=${validChallenge}`,
    );
  });

  it('derives the BFF origin from the Expo LAN host when mobile env is absent', () => {
    mockExpoConstants.expoConfig.hostUri = '192.168.1.10:8081';

    expect(buildMobileOAuthStartUrl('github', validState, validChallenge)).toBe(
      `http://192.168.1.10:3000/api/v1/auth/oauth/github?mobile_redirect_uri=nt208%3A%2F%2Fauth%2Foauth%2Fcallback&mobile_state=${validState}&mobile_code_challenge=${validChallenge}`,
    );
  });

  it('requires HTTPS for production BFF origin', () => {
    setDevMode(false);
    process.env.EXPO_PUBLIC_WEB_APP_URL = 'http://healthos.example.com';

    expect(() => buildMobileOAuthStartUrl('google', validState, validChallenge)).toThrow('Production web app URL must use HTTPS.');
  });

  it('accepts production HTTPS BFF origin from app config', () => {
    setDevMode(false);
    mockExpoConstants.expoConfig.extra.webAppUrl = 'https://healthos.example.com/';

    expect(buildMobileOAuthStartUrl('github', validState, validChallenge)).toBe(
      `https://healthos.example.com/api/v1/auth/oauth/github?mobile_redirect_uri=nt208%3A%2F%2Fauth%2Foauth%2Fcallback&mobile_state=${validState}&mobile_code_challenge=${validChallenge}`,
    );
  });

  it('generates crypto-backed mobile OAuth state and verifier values', () => {
    expect(createMobileOAuthState()).toBe(generatedState);
    expect(createMobileOAuthVerifier()).toBe(generatedVerifier);
    expect(mockGetRandomValues).toHaveBeenCalledTimes(2);
  });

  it('uses Expo Crypto random bytes without requiring ambient Web Crypto', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
    });

    try {
      expect(createMobileOAuthVerifier()).toBe(generatedState);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: originalCrypto,
      });
    }

    expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
  });

  it('hashes the mobile OAuth verifier into a challenge', async () => {
    await expect(createMobileOAuthCodeChallenge(generatedVerifier)).resolves.toBe(generatedChallenge);
    expect(mockDigestStringAsync).toHaveBeenCalledWith('SHA-256', generatedVerifier);
  });

  it('parses provider handoff callbacks', () => {
    expect(parseMobileOAuthCallbackUrl(`nt208://auth/oauth/callback?provider=github&code=abc&state=${validState}`, 'github', validState)).toEqual({
      provider: 'github',
      code: 'abc',
      state: validState,
    });
  });

  it('rejects mismatched provider callbacks', () => {
    expect(() => parseMobileOAuthCallbackUrl(`nt208://auth/oauth/callback?provider=google&code=abc&state=${validState}`, 'github', validState)).toThrow(
      'OAuth provider callback did not match the requested provider.',
    );
  });

  it('rejects callbacks without the expected mobile state', () => {
    expect(() => parseMobileOAuthCallbackUrl('nt208://auth/oauth/callback?provider=github&code=abc', 'github', validState)).toThrow(
      'OAuth callback did not include state.',
    );
    expect(() => parseMobileOAuthCallbackUrl(`nt208://auth/oauth/callback?provider=github&code=abc&state=${'b'.repeat(64)}`, 'github', validState)).toThrow(
      'OAuth callback state did not match the requested sign-in.',
    );
  });

  it.each([
    'https://healthos.example.com/auth/oauth/callback?provider=github&code=abc',
    'nt208://auth/oauth/wrong?provider=github&code=abc',
    'nt208://evil/oauth/callback?provider=github&code=abc',
    'nt208://auth:/oauth/callback?provider=github&code=abc',
    'nt208://auth:123/oauth/callback?provider=github&code=abc',
    'nt208://user:pass@auth/oauth/callback?provider=github&code=abc',
    'nt208://auth/oauth/callback/?provider=github&code=abc',
  ])('rejects callbacks outside the mobile redirect URI: %s', (url) => {
    expect(() => parseMobileOAuthCallbackUrl(url, 'github', validState)).toThrow(
      'OAuth callback URL did not match the expected mobile redirect.',
    );
  });
});

describe('authService.login', () => {
  it('returns token data without calling saveAuthToken', async () => {
    const resp: DataResponse<AuthLoginResult> = { data: mockToken };
    mockApiRequest.mockResolvedValueOnce(resp);
    const result = await authService.login('user', 'pass');
    expect(result).toEqual(mockToken);
    expect(mockEnsureCoreReachable).toHaveBeenCalledTimes(1);
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/login', {
      method: 'POST',
      auth: false,
      json: { identifier: 'user', password: 'pass' },
      timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    });
    expect(mockSaveAuthToken).not.toHaveBeenCalled();
  });

  it('returns MFA challenge when backend requires second factor', async () => {
    const resp: DataResponse<AuthLoginResult> = {
      data: { mfa_required: true, challenge_id: 'ch-1', expires_in_seconds: 300 },
    };
    mockApiRequest.mockResolvedValueOnce(resp);
    const result = await authService.login('user', 'pass');
    expect(result).toEqual(resp.data);
    expect(mockEnsureCoreReachable).toHaveBeenCalledTimes(1);
    expect(mockSaveAuthToken).not.toHaveBeenCalled();
  });

  it('stops before credential submit when Core is unreachable', async () => {
    mockEnsureCoreReachable.mockRejectedValueOnce(new Error('Core unreachable'));

    await expect(authService.login('user', 'pass')).rejects.toThrow('Core unreachable');

    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

describe('authService.verifyOtp', () => {
  it('calls saveAuthToken when response contains access_token', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: mockToken });
    mockSaveAuthToken.mockResolvedValueOnce();
    await authService.verifyOtp({ email: 'a@b.com', purpose: 'signup', code: '123456' });
    expect(mockSaveAuthToken).toHaveBeenCalledWith(mockToken);
  });

  it('does not call saveAuthToken when response is next_step challenge', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { email: 'a@b.com', next_step: 'verify_email' } });
    await authService.verifyOtp({ email: 'a@b.com', purpose: 'login', code: '123456' });
    expect(mockSaveAuthToken).not.toHaveBeenCalled();
  });

  it('maps network failures to Core reachability guidance', async () => {
    mockApiRequest.mockRejectedValueOnce(new ApiError('Network request failed.', 0, 'NETWORK_ERROR'));
    mockToCoreReachabilityMessage.mockReturnValueOnce('Core unreachable at http://localhost:8000. Physical Expo Go cannot use localhost.');

    const err = await authService.verifyOtp({
      email: 'a@b.com',
      purpose: 'signup',
      code: '123456',
    }).catch((error: unknown) => error);

    expect(err).toMatchObject({
      code: 'CORE_UNREACHABLE',
      message: 'Core unreachable at http://localhost:8000. Physical Expo Go cannot use localhost.',
    });
    expect(mockSaveAuthToken).not.toHaveBeenCalled();
  });
});

describe('authService.verifyLoginMfa', () => {
  it('calls /v1/auth/login/mfa and stores returned session token', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: mockToken });
    mockSaveAuthToken.mockResolvedValueOnce();
    const result = await authService.verifyLoginMfa('challenge-id', '123456');
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/login/mfa', {
      method: 'POST',
      auth: false,
      json: { challenge_id: 'challenge-id', code: '123456' },
      timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    });
    expect(mockSaveAuthToken).toHaveBeenCalledWith(mockToken);
    expect(result).toEqual(mockToken);
  });

  it('maps MFA network failures to Core reachability guidance', async () => {
    mockApiRequest.mockRejectedValueOnce(new ApiError('Request timed out.', 0, 'TIMEOUT'));
    mockToCoreReachabilityMessage.mockReturnValueOnce('Core unreachable at http://192.168.1.10:8000. Verify the phone and computer share the LAN.');

    const err = await authService.verifyLoginMfa('challenge-id', '123456').catch((error: unknown) => error);

    expect(err).toMatchObject({
      code: 'CORE_UNREACHABLE',
      message: 'Core unreachable at http://192.168.1.10:8000. Verify the phone and computer share the LAN.',
    });
    expect(mockSaveAuthToken).not.toHaveBeenCalled();
  });
});

describe('authService.resetPassword', () => {
  it('submits reset payload and stores returned token', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: mockToken });
    mockSaveAuthToken.mockResolvedValueOnce();
    const result = await authService.resetPassword('a@b.com', 'newpass');
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/reset-password', {
      method: 'POST',
      auth: false,
      json: { email: 'a@b.com', new_password: 'newpass' },
      timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    });
    expect(mockSaveAuthToken).toHaveBeenCalledWith(mockToken);
    expect(result).toEqual(mockToken);
  });

  it('maps reset-password network failures to Core reachability guidance', async () => {
    mockApiRequest.mockRejectedValueOnce(new ApiError('Network request failed.', 0, 'NETWORK_ERROR'));
    mockToCoreReachabilityMessage.mockReturnValueOnce('Core unreachable at http://localhost:8000. Physical Expo Go cannot use localhost.');

    const err = await authService.resetPassword('a@b.com', 'newpass').catch((error: unknown) => error);

    expect(err).toMatchObject({
      code: 'CORE_UNREACHABLE',
      message: 'Core unreachable at http://localhost:8000. Physical Expo Go cannot use localhost.',
    });
    expect(mockSaveAuthToken).not.toHaveBeenCalled();
  });
});

describe('authService.requestOtp', () => {
  it('maps OTP request network failures to Core reachability guidance', async () => {
    mockApiRequest.mockRejectedValueOnce(new ApiError('Network request failed.', 0, 'NETWORK_ERROR'));
    mockToCoreReachabilityMessage.mockReturnValueOnce('Core unreachable at http://localhost:8000. Physical Expo Go cannot use localhost.');

    const err = await authService.requestOtp({
      email: 'a@b.com',
      purpose: 'signup',
    }).catch((error: unknown) => error);

    expect(mockEnsureCoreReachable).toHaveBeenCalledTimes(1);
    expect(err).toMatchObject({
      code: 'CORE_UNREACHABLE',
      message: 'Core unreachable at http://localhost:8000. Physical Expo Go cannot use localhost.',
    });
  });
});

describe('authService.refreshToken', () => {
  it('throws when no refresh token stored', async () => {
    mockGetRefreshToken.mockResolvedValueOnce(null);
    await expect(authService.refreshToken()).rejects.toThrow('No refresh token stored.');
  });

  it('calls /v1/auth/refresh with auth:false and saves token', async () => {
    mockGetRefreshToken.mockResolvedValueOnce('rt-tok');
    mockApiRequest.mockResolvedValueOnce({ data: mockToken });
    mockSaveAuthToken.mockResolvedValueOnce();
    const result = await authService.refreshToken();
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/refresh', {
      method: 'POST',
      auth: false,
      json: { refresh_token: 'rt-tok' },
      timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    });
    expect(mockSaveAuthToken).toHaveBeenCalledWith(mockToken);
    expect(result).toEqual(mockToken);
  });
});

describe('authService.signInWithOAuth', () => {
  it('opens the BFF provider flow and redeems the returned Core handoff code', async () => {
    process.env.EXPO_PUBLIC_WEB_APP_URL = 'http://localhost:3000/';
    mockOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: `nt208://auth/oauth/callback?provider=github&code=handoff-code&state=${generatedState}`,
    });
    mockApiRequest.mockResolvedValueOnce({ data: mockToken });
    mockSaveAuthToken.mockResolvedValueOnce();

    const result = await authService.signInWithOAuth('github');

    expect(mockOpenAuthSessionAsync).toHaveBeenCalledWith(
      `http://localhost:3000/api/v1/auth/oauth/github?mobile_redirect_uri=nt208%3A%2F%2Fauth%2Foauth%2Fcallback&mobile_state=${generatedState}&mobile_code_challenge=${generatedChallenge}`,
      'nt208://auth/oauth/callback',
    );
    expect(mockEnsureCoreReachable).toHaveBeenCalledTimes(1);
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/mobile-oauth/redeem', {
      method: 'POST',
      auth: false,
      json: { code: 'handoff-code', state: generatedState, code_verifier: generatedVerifier },
      timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    });
    expect(mockSaveAuthToken).toHaveBeenCalledWith(mockToken);
    expect(result).toEqual(mockToken);
  });

  it('opens the Google BFF provider flow and redeems the returned Core handoff code', async () => {
    process.env.EXPO_PUBLIC_WEB_APP_URL = 'http://localhost:3000/';
    mockOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: `nt208://auth/oauth/callback?provider=google&code=google-handoff-code&state=${generatedState}`,
    });
    mockApiRequest.mockResolvedValueOnce({ data: mockToken });
    mockSaveAuthToken.mockResolvedValueOnce();

    const result = await authService.signInWithOAuth('google');

    expect(mockOpenAuthSessionAsync).toHaveBeenCalledWith(
      `http://localhost:3000/api/v1/auth/oauth/google?mobile_redirect_uri=nt208%3A%2F%2Fauth%2Foauth%2Fcallback&mobile_state=${generatedState}&mobile_code_challenge=${generatedChallenge}`,
      'nt208://auth/oauth/callback',
    );
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/mobile-oauth/redeem', {
      method: 'POST',
      auth: false,
      json: { code: 'google-handoff-code', state: generatedState, code_verifier: generatedVerifier },
      timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    });
    expect(mockSaveAuthToken).toHaveBeenCalledWith(mockToken);
    expect(result).toEqual(mockToken);
  });

  it('does not call Core when the browser session is cancelled', async () => {
    mockOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'cancel',
    } as Awaited<ReturnType<typeof WebBrowser.openAuthSessionAsync>>);

    await expect(authService.signInWithOAuth('google')).rejects.toMatchObject({ code: 'OAUTH_CANCELLED' });

    expect(mockApiRequest).not.toHaveBeenCalled();
    expect(mockSaveAuthToken).not.toHaveBeenCalled();
  });

  it('does not redeem Core handoff codes from a non-exact mobile callback URL', async () => {
    mockOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: `nt208://auth/oauth/callback/?provider=github&code=handoff-code&state=${generatedState}`,
    });

    await expect(authService.signInWithOAuth('github')).rejects.toMatchObject({
      code: 'OAUTH_CALLBACK_REDIRECT_MISMATCH',
    });

    expect(mockApiRequest).not.toHaveBeenCalled();
    expect(mockEnsureCoreReachable).not.toHaveBeenCalled();
    expect(mockSaveAuthToken).not.toHaveBeenCalled();
  });

  it('does not redeem injected Core handoff codes when callback state is missing or mismatched', async () => {
    mockOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: 'nt208://auth/oauth/callback?provider=github&code=handoff-code',
    });

    await expect(authService.signInWithOAuth('github')).rejects.toMatchObject({ code: 'OAUTH_STATE_MISSING' });

    mockOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: `nt208://auth/oauth/callback?provider=github&code=handoff-code&state=${'b'.repeat(64)}`,
    });

    await expect(authService.signInWithOAuth('github')).rejects.toMatchObject({ code: 'OAUTH_STATE_MISMATCH' });

    expect(mockApiRequest).not.toHaveBeenCalled();
    expect(mockEnsureCoreReachable).not.toHaveBeenCalled();
    expect(mockSaveAuthToken).not.toHaveBeenCalled();
  });
});

describe('authService.logout', () => {
  it('clears session even when API call fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockGetRefreshToken.mockResolvedValueOnce('rt-tok');
    mockApiRequest.mockRejectedValueOnce(new Error('network'));
    mockClearStoredSession.mockResolvedValueOnce();
    try {
      await authService.logout();
      expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/logout', {
        method: 'POST',
        json: { refresh_token: 'rt-tok' },
        timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
      });
      expect(mockClearStoredSession).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        '[authService] remote logout failed after local session clear:',
        expect.any(Error),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('rejects when local session clear fails', async () => {
    mockGetRefreshToken.mockResolvedValueOnce('rt-tok');
    mockClearStoredSession.mockRejectedValueOnce(new Error('secure delete failed'));

    await expect(authService.logout()).rejects.toThrow('secure delete failed');

    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it('clears session on success when no refresh token is stored', async () => {
    mockGetRefreshToken.mockResolvedValueOnce(null);
    mockApiRequest.mockResolvedValueOnce(undefined);
    mockClearStoredSession.mockResolvedValueOnce();
    await authService.logout();
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/logout', {
      method: 'POST',
      json: {},
      timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    });
    expect(mockClearStoredSession).toHaveBeenCalled();
  });
});
