import { ApiError, apiRequest } from '../client';
import { AUTH_REQUEST_TIMEOUT_MS, ensureCoreReachable, toCoreReachabilityMessage } from '../core-reachability';
import { buildExpoDevLanBaseUrl } from '../expo-dev-host';
import { clearStoredSession, getAccessToken, getRefreshToken, saveAuthToken } from '../../auth/session-store';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type {
  AuthLoginResult,
  AuthToken,
  DataResponse,
  OtpNextStep,
  OtpRequested,
  RequestOtpBody,
  VerifyOtpBody,
} from '../../types/api';

export type MobileOAuthProvider = 'google' | 'github';

const DEFAULT_MOBILE_OAUTH_REDIRECT_URI = 'nt208://auth/oauth/callback';

async function submitPublicAuthRequest<T>(request: () => Promise<T>): Promise<T> {
  await ensureCoreReachable();
  try {
    return await request();
  } catch (error) {
    const message = toCoreReachabilityMessage(error);
    if (!message) throw error;
    throw new ApiError(message, 0, 'CORE_UNREACHABLE', {
      causeCode: error instanceof ApiError ? error.code : 'UNKNOWN',
    });
  }
}

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function assertProductionWebAppBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim().replace(/\/+$/, '');
  if (!trimmed) {
    throw new ApiError('Missing EXPO_PUBLIC_WEB_APP_URL for mobile OAuth.', 0, 'WEB_APP_URL_MISSING');
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ApiError('Production web app URL must be an absolute HTTPS URL.', 0, 'INVALID_WEB_APP_URL');
  }
  if (parsed.protocol !== 'https:') {
    throw new ApiError('Production web app URL must use HTTPS.', 0, 'INSECURE_WEB_APP_URL');
  }
  return parsed.toString().replace(/\/+$/, '');
}

export function getWebAppBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { webAppUrl?: string } | undefined;
  const rawConfigured = process.env.EXPO_PUBLIC_WEB_APP_URL ?? extra?.webAppUrl;
  if (!__DEV__) {
    return assertProductionWebAppBaseUrl(rawConfigured);
  }
  const configured = normalizeBaseUrl(rawConfigured);
  if (configured) return configured;
  return buildExpoDevLanBaseUrl('http', 3000)
    ?? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');
}

export function getMobileOAuthRedirectUri(): string {
  const extra = Constants.expoConfig?.extra as { mobileOAuthRedirectUri?: string } | undefined;
  const configured = normalizeMobileOAuthRedirectUri(process.env.EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI ?? extra?.mobileOAuthRedirectUri);
  if (configured?.startsWith('https:') && Platform.OS !== 'android') {
    return DEFAULT_MOBILE_OAUTH_REDIRECT_URI;
  }
  return configured ?? DEFAULT_MOBILE_OAUTH_REDIRECT_URI;
}

function encodeBase16(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createMobileOAuthState(): string {
  return createMobileOAuthVerifier();
}

export function createMobileOAuthVerifier(): string {
  const bytes = new Uint8Array(32);
  Crypto.getRandomValues(bytes);
  return encodeBase16(bytes);
}

export async function createMobileOAuthCodeChallenge(verifier: string): Promise<string> {
  const normalized = assertMobileOAuthState(verifier);
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized);
  return assertMobileOAuthState(digest.toLowerCase());
}

function assertMobileOAuthState(value: string): string {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new ApiError('OAuth state was invalid.', 0, 'OAUTH_STATE_INVALID');
  }
  return value;
}

function normalizeMobileOAuthRedirectUri(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ApiError('Mobile OAuth redirect URI must be an absolute URL.', 0, 'OAUTH_REDIRECT_URI_INVALID');
  }

  parsed.search = '';
  parsed.hash = '';
  if (parsed.username || parsed.password) {
    throw new ApiError('Mobile OAuth redirect URI cannot include credentials.', 0, 'OAUTH_REDIRECT_URI_INVALID');
  }
  if (parsed.protocol === 'nt208:') {
    if (parsed.host !== 'auth' || parsed.pathname !== '/oauth/callback') {
      throw new ApiError('Mobile OAuth custom-scheme redirect URI was invalid.', 0, 'OAUTH_REDIRECT_URI_INVALID');
    }
    return parsed.toString();
  }
  if (parsed.protocol === 'https:' && parsed.hostname && !parsed.port) {
    return parsed.toString();
  }
  throw new ApiError('Mobile OAuth App Link redirect URI must use production HTTPS.', 0, 'OAUTH_REDIRECT_URI_INVALID');
}

export function buildMobileOAuthStartUrl(provider: MobileOAuthProvider, state: string, codeChallenge: string): string {
  const url = new URL(`/api/v1/auth/oauth/${provider}`, getWebAppBaseUrl());
  url.searchParams.set('mobile_redirect_uri', getMobileOAuthRedirectUri());
  url.searchParams.set('mobile_state', assertMobileOAuthState(state));
  url.searchParams.set('mobile_code_challenge', assertMobileOAuthState(codeChallenge));
  return url.toString();
}

function readStringParam(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && raw.trim() ? raw : null;
}

function readSearchParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key);
  return readStringParam(value);
}

function getExpectedMobileOAuthCallback(): URL {
  return new URL(getMobileOAuthRedirectUri());
}

function parseExpectedMobileOAuthCallback(url: string): URL {
  const rawBase = url.split('#', 1)[0]?.split('?', 1)[0] ?? '';
  if (rawBase !== getMobileOAuthRedirectUri()) {
    throw new ApiError('OAuth callback URL did not match the expected mobile redirect.', 0, 'OAUTH_CALLBACK_REDIRECT_MISMATCH');
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ApiError('OAuth callback URL did not match the expected mobile redirect.', 0, 'OAUTH_CALLBACK_REDIRECT_MISMATCH');
  }
  const expected = getExpectedMobileOAuthCallback();
  if (
    parsed.protocol !== expected.protocol
    || parsed.host !== expected.host
    || parsed.pathname !== expected.pathname
    || parsed.username
    || parsed.password
  ) {
    throw new ApiError('OAuth callback URL did not match the expected mobile redirect.', 0, 'OAUTH_CALLBACK_REDIRECT_MISMATCH');
  }
  return parsed;
}

export function parseMobileOAuthCallbackUrl(
  url: string,
  expectedProvider: MobileOAuthProvider,
  expectedState: string,
): {
  provider: MobileOAuthProvider;
  code: string;
  state: string;
} {
  const parsed = parseExpectedMobileOAuthCallback(url);
  const provider = readSearchParam(parsed.searchParams, 'provider');
  if (provider !== 'google' && provider !== 'github') {
    throw new ApiError('OAuth provider is missing from callback.', 0, 'OAUTH_PROVIDER_MISSING');
  }
  if (expectedProvider && provider !== expectedProvider) {
    throw new ApiError('OAuth provider callback did not match the requested provider.', 0, 'OAUTH_PROVIDER_MISMATCH');
  }
  const expected = assertMobileOAuthState(expectedState);
  const state = readSearchParam(parsed.searchParams, 'state');
  if (!state) {
    throw new ApiError('OAuth callback did not include state.', 0, 'OAUTH_STATE_MISSING');
  }
  if (state !== expected) {
    throw new ApiError('OAuth callback state did not match the requested sign-in.', 0, 'OAUTH_STATE_MISMATCH');
  }
  const error = readSearchParam(parsed.searchParams, 'error');
  if (error) {
    throw new ApiError(`OAuth sign-in failed: ${error}.`, 0, 'OAUTH_FAILED', { provider, error });
  }
  const code = readSearchParam(parsed.searchParams, 'code');
  if (!code) {
    throw new ApiError('OAuth callback did not include a handoff code.', 0, 'OAUTH_CODE_MISSING');
  }
  return { provider, code, state };
}

export const authService = {
  async login(identifier: string, password: string) {
    const response = await submitPublicAuthRequest(() => apiRequest<DataResponse<AuthLoginResult>>('/v1/auth/login', {
      method: 'POST',
      auth: false,
      json: { identifier, password },
      timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    }));
    return response.data;
  },

  async verifyLoginMfa(challenge_id: string, code: string): Promise<AuthToken> {
    const response = await submitPublicAuthRequest(() => apiRequest<DataResponse<AuthToken>>('/v1/auth/login/mfa', {
      method: 'POST',
      auth: false,
      json: { challenge_id, code },
      timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    }));
    await saveAuthToken(response.data);
    return response.data;
  },

  async requestOtp(body: RequestOtpBody) {
    return submitPublicAuthRequest(() => apiRequest<DataResponse<OtpRequested>>('/v1/auth/request-otp', {
      method: 'POST',
      auth: false,
      json: body,
      timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    }));
  },

  async verifyOtp(body: VerifyOtpBody) {
    const response = await submitPublicAuthRequest(() => apiRequest<DataResponse<AuthToken | OtpNextStep>>('/v1/auth/verify-otp', {
      method: 'POST',
      auth: false,
      json: body,
      timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    }));
    if ('access_token' in response.data) {
      await saveAuthToken(response.data);
    }
    return response.data;
  },

  async resetPassword(email: string, newPassword: string): Promise<AuthToken> {
    const response = await submitPublicAuthRequest(() => apiRequest<DataResponse<AuthToken>>('/v1/auth/reset-password', {
      method: 'POST',
      auth: false,
      json: { email, new_password: newPassword },
      timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    }));
    await saveAuthToken(response.data);
    return response.data;
  },

  async logout() {
    const accessToken = await getAccessToken();
    const refresh_token = await getRefreshToken();

    await clearStoredSession();

    try {
      await apiRequest('/v1/auth/logout', {
        method: 'POST',
        json: refresh_token ? { refresh_token } : {},
        auth: false,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
      });
    } catch (error) {
      if (__DEV__) {
        console.warn('[authService] remote logout failed after local session clear:', error);
      }
    }
  },

  async refreshToken(): Promise<AuthToken> {
    const refresh_token = await getRefreshToken();
    if (!refresh_token) throw new Error('No refresh token stored.');
    const response = await apiRequest<DataResponse<AuthToken>>(
      '/v1/auth/refresh',
      { method: 'POST', auth: false, json: { refresh_token }, timeoutMs: AUTH_REQUEST_TIMEOUT_MS },
    );
    await saveAuthToken(response.data);
    return response.data;
  },

  async redeemMobileOAuthCode(code: string, state: string, codeVerifier: string): Promise<AuthToken> {
    const response = await submitPublicAuthRequest(() => apiRequest<DataResponse<AuthToken>>(
      '/v1/auth/mobile-oauth/redeem',
      {
        method: 'POST',
        auth: false,
        json: {
          code,
          state: assertMobileOAuthState(state),
          code_verifier: assertMobileOAuthState(codeVerifier),
        },
        timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
      },
    ));
    await saveAuthToken(response.data);
    return response.data;
  },

  async signInWithOAuth(provider: MobileOAuthProvider): Promise<AuthToken> {
    const redirectUri = getMobileOAuthRedirectUri();
    const state = createMobileOAuthState();
    const codeVerifier = createMobileOAuthVerifier();
    const codeChallenge = await createMobileOAuthCodeChallenge(codeVerifier);
    const result = await WebBrowser.openAuthSessionAsync(
      buildMobileOAuthStartUrl(provider, state, codeChallenge),
      redirectUri,
    );
    if (result.type !== 'success' || !('url' in result) || !result.url) {
      throw new ApiError('OAuth sign-in was cancelled.', 0, 'OAUTH_CANCELLED');
    }
    const callback = parseMobileOAuthCallbackUrl(result.url, provider, state);
    return this.redeemMobileOAuthCode(callback.code, callback.state, codeVerifier);
  },
};
