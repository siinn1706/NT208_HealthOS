import i18next from 'i18next';
import { ApiError } from './client';

const INFRASTRUCTURE_ERROR_PATTERNS = [
  /cloudflare/i,
  /origin web server/i,
  /invalid or incomplete response/i,
];
const SERVER_FAILURE_MESSAGE_PATTERNS = [
  /request failed with status 5\d{2}\.?/i,
  /\bhttp\s*5\d{2}\b/i,
  /internal server error/i,
  /bad gateway/i,
  /service unavailable/i,
  /gateway timeout/i,
];
const NETWORK_ERROR_CODES = new Set(['NETWORK_ERROR', 'TIMEOUT']);

export function isInfrastructureErrorMessage(message: string | null | undefined): boolean {
  return INFRASTRUCTURE_ERROR_PATTERNS.some((pattern) => pattern.test(message ?? ''));
}

export function isServerFailureMessage(message: string | null | undefined): boolean {
  return SERVER_FAILURE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message ?? ''));
}

function localizedServerError(): string {
  return translateOrDefault('api.error.internal_server_error', 'An unexpected server error occurred.');
}

function translateOrDefault(key: string, defaultValue: string): string {
  const translated = i18next.t(key, {
    defaultValue,
  });
  return typeof translated === 'string' && translated.trim() ? translated : defaultValue;
}

function genericErrorFallback(fallback?: string): string {
  if (fallback) return fallback;
  return translateOrDefault('api.genericError', 'Something went wrong.');
}

function offlineErrorFallback(): string {
  return translateOrDefault('api.offline', 'No internet connection.');
}

function translateApiErrorCode(code: string): string | null {
  const localized = i18next.t(`api.error.${code.toLowerCase()}`, {
    defaultValue: '',
  });
  return typeof localized === 'string' && localized.trim() ? localized : null;
}

/**
 * Returns a localized user-facing message for an API error.
 * Maps `error.code` to the `api.error.{lowercase_code}` i18n key,
 * falling back to the raw backend message, then to a generic fallback.
 */
export function localizeError(error: Error | null | undefined, fallback?: string): string {
  const genericFallback = genericErrorFallback(fallback);
  if (!error) return genericFallback;

  if (error instanceof ApiError) {
    if (error.code === 'CORE_UNREACHABLE' && error.message) {
      return error.message;
    }
    if (error.code && error.code !== 'REQUEST_FAILED' && !NETWORK_ERROR_CODES.has(error.code)) {
      const localized = translateApiErrorCode(error.code);
      if (localized) return localized;
    }
    if (error.status === 0) {
      return offlineErrorFallback();
    }
    if (error.status >= 500 || isInfrastructureErrorMessage(error.message)) {
      return localizedServerError();
    }
    if (error.message && error.message !== `Request failed with status ${error.status}.`) {
      return error.message;
    }
  }

  if (isInfrastructureErrorMessage(error.message)) {
    return localizedServerError();
  }

  return error.message || genericFallback;
}

export function localizeDisplayMessage(message: string | null | undefined, fallback?: string): string | undefined {
  const trimmed = message?.trim();
  if (!trimmed) return fallback;
  if (isInfrastructureErrorMessage(trimmed) || isServerFailureMessage(trimmed)) {
    return localizedServerError();
  }
  return trimmed;
}

/** Legacy helper — kept for backward compatibility. Prefer localizeError. */
export function humanizeError(error: Error | null, fallback = 'Something went wrong.'): string {
  if (!error) return fallback;
  if (__DEV__) return error.message || fallback;
  if (error instanceof ApiError && error.status === 0) {
    return 'Network error. Check your connection.';
  }
  if (error instanceof ApiError && error.status >= 500) {
    return 'A server error occurred. Please try again.';
  }
  return fallback;
}
