/* eslint-env jest */
import { humanizeError } from '../api/error-message';
import { ApiError } from '../api/client';

describe('humanizeError', () => {
  it('returns fallback for null error', () => {
    expect(humanizeError(null)).toBe('Something went wrong.');
  });

  it('returns custom fallback for null error', () => {
    expect(humanizeError(null, 'Custom fallback')).toBe('Custom fallback');
  });

  it('returns network error message for ApiError with status 0', () => {
    const err = new ApiError('Network error', 0);
    // In non-dev, status 0 → network message
    Object.defineProperty(global, '__DEV__', { value: false, writable: true, configurable: true });
    expect(humanizeError(err)).toBe('Network error. Check your connection.');
  });

  it('returns server error message for ApiError with status >= 500', () => {
    Object.defineProperty(global, '__DEV__', { value: false, writable: true, configurable: true });
    expect(humanizeError(new ApiError('Internal error', 500))).toBe('A server error occurred. Please try again.');
    expect(humanizeError(new ApiError('Gateway error', 503))).toBe('A server error occurred. Please try again.');
  });

  it('returns fallback for ApiError with 4xx status', () => {
    Object.defineProperty(global, '__DEV__', { value: false, writable: true, configurable: true });
    expect(humanizeError(new ApiError('Not found', 404))).toBe('Something went wrong.');
  });

  it('returns error.message in DEV mode', () => {
    Object.defineProperty(global, '__DEV__', { value: true, writable: true, configurable: true });
    expect(humanizeError(new Error('Dev detail'))).toBe('Dev detail');
  });

  it('returns fallback in DEV mode if error.message is empty', () => {
    Object.defineProperty(global, '__DEV__', { value: true, writable: true, configurable: true });
    const err = new Error('');
    expect(humanizeError(err)).toBe('Something went wrong.');
  });

  it('returns fallback for plain Error in production', () => {
    Object.defineProperty(global, '__DEV__', { value: false, writable: true, configurable: true });
    expect(humanizeError(new Error('Any error'))).toBe('Something went wrong.');
  });
});
