import i18next from 'i18next';
import { ApiError } from './client';

const INFRASTRUCTURE_ERROR_PATTERNS = [
  /cloudflare/i,
  /origin web server/i,
  /invalid or incomplete response/i,
];

export function isInfrastructureErrorMessage(message: string | null | undefined): boolean {
  return INFRASTRUCTURE_ERROR_PATTERNS.some((pattern) => pattern.test(message ?? ''));
}

function localizedServerError(): string {
  return i18next.t('api.error.internal_server_error', {
    defaultValue: 'An unexpected server error occurred.',
  });
}

/**
 * Returns a localized user-facing message for an API error.
 * Maps `error.code` to the `api.error.{lowercase_code}` i18n key,
 * falling back to the raw backend message, then to a generic fallback.
 */
export function localizeError(error: Error | null | undefined, fallback?: string): string {
  const genericFallback = fallback ?? i18next.t('api.genericError');
  if (!error) return genericFallback;

  if (error instanceof ApiError) {
    if (error.status === 0) {
      return i18next.t('api.offline', { defaultValue: 'No internet connection.' });
    }
    if (error.code && error.code !== 'REQUEST_FAILED') {
      const i18nKey = `api.error.${error.code.toLowerCase()}`;
      const localized = i18next.t(i18nKey, { defaultValue: '' });
      if (localized) return localized;
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
