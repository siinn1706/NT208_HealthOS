import { ApiError } from './client';

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
