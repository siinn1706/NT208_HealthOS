import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { clearStoredSession, getAccessToken } from '../auth/session-store';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  json?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Internal: prevents infinite retry loop on 401. */
  _retried?: boolean;
}

export class ApiError extends Error {
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
}

let unauthorizedHandler: (() => void | Promise<void>) | null = null;
let refreshHandler: (() => Promise<boolean>) | null = null;
/** Deduplicates concurrent 401 refresh attempts — N parallel requests share one refresh call. */
let refreshPromise: Promise<boolean> | null = null;
/** Grace period after a successful refresh — skip re-refresh within 2s. */
let refreshGraceUntil = 0;

export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null) {
  unauthorizedHandler = handler;
}

/**
 * Inject a token-refresh callback. Return true if refresh succeeded (new token
 * is now in SecureStore), false if it failed (session should be cleared).
 * Called by SessionProvider on mount so client.ts stays free of service imports.
 */
export function setRefreshHandler(handler: (() => Promise<boolean>) | null) {
  refreshHandler = handler;
  refreshPromise = null;
  refreshGraceUntil = 0;
}

export function getCoreApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { coreApiUrl?: string } | undefined;
  const configured = process.env.EXPO_PUBLIC_CORE_API_URL ?? extra?.coreApiUrl;
  const fallback = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
  const url = (configured || fallback).replace(/\/+$/, '');
  if (!__DEV__ && url.startsWith('http://')) {
    console.warn('[HealthOS] Core API URL is not HTTPS in production:', url);
  }
  return url;
}

export function getCoreWsBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { coreWsUrl?: string } | undefined;
  const configured = process.env.EXPO_PUBLIC_CORE_WS_URL ?? extra?.coreWsUrl;
  const fallback = Platform.OS === 'android' ? 'ws://10.0.2.2:8000' : 'ws://localhost:8000';
  return (configured || fallback).replace(/\/+$/, '');
}

export function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30000);
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };

    if (options.json !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.auth !== false) {
      const token = await getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${getCoreApiBaseUrl()}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.json === undefined ? undefined : JSON.stringify(options.json),
      signal: controller.signal,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '');

    if (!response.ok) {
      const err = normalizeError(payload, response.status);
      if (response.status === 401 && !options._retried && refreshHandler) {
        if (Date.now() < refreshGraceUntil) {
          return apiRequest<T>(path, { ...options, _retried: true });
        }
        if (!refreshPromise) {
          refreshPromise = refreshHandler().catch(() => false).finally(() => {
            refreshGraceUntil = Date.now() + 2000;
            refreshPromise = null;
          });
        }
        const refreshed = await refreshPromise;
        if (refreshed) {
          return apiRequest<T>(path, { ...options, _retried: true });
        }
        await clearStoredSession();
        await unauthorizedHandler?.();
        throw err;
      }
      if (response.status === 401) {
        await clearStoredSession();
        await unauthorizedHandler?.();
      }
      throw err;
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const isAbort = error instanceof Error && error.name === 'AbortError';
    throw new ApiError(isAbort ? 'Request timed out.' : 'Network request failed.', 0, isAbort ? 'TIMEOUT' : 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeError(payload: unknown, status: number): ApiError {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    const detail = obj.error ?? obj.detail ?? obj;
    if (detail && typeof detail === 'object') {
      const d = detail as Record<string, unknown>;
      return new ApiError(
        String(d.message ?? d.detail ?? `Request failed with status ${status}.`),
        status,
        String(d.code ?? obj.code ?? 'REQUEST_FAILED'),
        d.details ?? d.field_errors ?? detail,
      );
    }
    if (typeof detail === 'string') {
      return new ApiError(detail, status);
    }
  }
  return new ApiError(`Request failed with status ${status}.`, status);
}
