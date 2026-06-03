import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { clearStoredSession, getAccessToken } from '../auth/session-store';
import { buildExpoDevLanBaseUrl } from './expo-dev-host';

export interface UploadFilePart {
  fieldName: string;
  uri: string;
  name: string;
  type: string;
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  json?: unknown;
  body?: unknown;
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

function assertProductionSecureUrl(kind: 'api' | 'ws', url: string | undefined): string {
  const normalized = (url ?? '').trim().replace(/\/+$/, '');
  if (kind === 'api' && !normalized) {
    throw new ApiError(
      'Missing EXPO_PUBLIC_API_URL for production build.',
      0,
      'CORE_API_URL_MISSING',
    );
  }
  if (kind === 'ws' && !normalized) {
    throw new ApiError(
      'Missing EXPO_PUBLIC_CORE_WS_URL for production build.',
      0,
      'CORE_WS_URL_MISSING',
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new ApiError(
      kind === 'api'
        ? 'Production API URL must be an absolute HTTPS URL.'
        : 'Production WebSocket URL must be an absolute WSS URL.',
      0,
      kind === 'api' ? 'INVALID_API_URL' : 'INVALID_WS_URL',
    );
  }
  if (kind === 'api' && parsed.protocol !== 'https:') {
    throw new ApiError(
      'Production API URL must use HTTPS.',
      0,
      'INSECURE_API_URL',
    );
  }
  if (kind === 'ws' && parsed.protocol !== 'wss:') {
    throw new ApiError(
      'Production WebSocket URL must use WSS.',
      0,
      'INSECURE_WS_URL',
    );
  }
  return normalized;
}

export function getCoreApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string; coreApiUrl?: string } | undefined;
  const configured = process.env.EXPO_PUBLIC_API_URL ?? extra?.apiUrl ?? extra?.coreApiUrl;
  if (!__DEV__) {
    return assertProductionSecureUrl('api', configured);
  }
  const fallback = buildExpoDevLanBaseUrl('http', 3000)
    ?? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');
  const url = (configured || fallback).replace(/\/+$/, '');
  return url;
}

export function getCoreWsBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { coreWsUrl?: string } | undefined;
  const configured = process.env.EXPO_PUBLIC_CORE_WS_URL ?? extra?.coreWsUrl;
  if (!__DEV__) {
    return assertProductionSecureUrl('ws', configured);
  }
  const fallback = buildExpoDevLanBaseUrl('ws', 8000)
    ?? (Platform.OS === 'android' ? 'ws://10.0.2.2:8000' : 'ws://localhost:8000');
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

export function createIdempotencyKey(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') {
    return randomUUID.call(globalThis.crypto);
  }

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createUploadFormData(
  fields: Record<string, string | number | boolean | null | undefined>,
  file?: UploadFilePart,
): FormData {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      form.append(key, String(value));
    }
  });
  if (file) {
    form.append(file.fieldName, {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
  }
  return form;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30000);
  const onAbort = () => controller.abort();
  if (options.signal) {
    options.signal.addEventListener('abort', onAbort);
  }

  // Refuse authenticated requests over plain HTTP in production
  if (!__DEV__ && options.auth !== false) {
    const baseUrl = getCoreApiBaseUrl();
    if (baseUrl.startsWith('http://')) {
      throw new ApiError(
        'Refusing to send authenticated request over plain HTTP in production.',
        0,
        'INSECURE_TRANSPORT',
      );
    }
  }

  try {
    if (options.json !== undefined && options.body !== undefined) {
      throw new ApiError('Use either json or body, not both.', 0, 'INVALID_REQUEST_BODY');
    }

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
      body: options.body !== undefined
        ? options.body as any
        : options.json === undefined ? undefined : JSON.stringify(options.json),
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
      const activeRefreshHandler = response.status === 401
        && options.auth !== false
        && !options._retried
        ? refreshHandler
        : null;
      if (activeRefreshHandler) {
        if (Date.now() < refreshGraceUntil) {
          return apiRequest<T>(path, { ...options, _retried: true });
        }
        if (!refreshPromise) {
          refreshPromise = activeRefreshHandler().catch(() => false).finally(() => {
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
      if (response.status === 401 && options.auth !== false) {
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
    options.signal?.removeEventListener('abort', onAbort);
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
