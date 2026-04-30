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

export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null) {
  unauthorizedHandler = handler;
}

export function getCoreApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { coreApiUrl?: string } | undefined;
  const configured = process.env.EXPO_PUBLIC_CORE_API_URL ?? extra?.coreApiUrl;
  const fallback = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
  return (configured || fallback).replace(/\/+$/, '');
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
  const controller = options.signal ? null : new AbortController();
  const timeout = controller
    ? setTimeout(() => controller.abort(), options.timeoutMs ?? 30000)
    : null;

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
      signal: options.signal ?? controller?.signal,
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
    if (timeout) clearTimeout(timeout);
  }
}

function normalizeError(payload: unknown, status: number): ApiError {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, any>;
    const detail = obj.error ?? obj.detail ?? obj;
    if (detail && typeof detail === 'object') {
      return new ApiError(
        String(detail.message ?? detail.detail ?? `Request failed with status ${status}.`),
        status,
        String(detail.code ?? obj.code ?? 'REQUEST_FAILED'),
        detail.details ?? detail.field_errors ?? detail,
      );
    }
    if (typeof detail === 'string') {
      return new ApiError(detail, status);
    }
  }
  return new ApiError(`Request failed with status ${status}.`, status);
}
