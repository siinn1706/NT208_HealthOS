/* eslint-env jest */
import { humanizeError, localizeError } from '../api/error-message';
import { ApiError } from '../api/client';

const mockT = jest.fn((key: string, opts?: { defaultValue?: string }) => {
  const map: Record<string, string> = {
    'api.offline': 'No internet connection.',
    'api.genericError': 'Something went wrong.',
    'api.error.invalid_credentials': 'Invalid username or password.',
    'api.error.internal_server_error': 'An unexpected server error occurred.',
  };
  return map[key] ?? opts?.defaultValue ?? '';
});

jest.mock('i18next', () => ({ t: (...args: Parameters<typeof mockT>) => mockT(...args) }));

describe('localizeError', () => {
  beforeEach(() => mockT.mockClear());

  it('returns genericError fallback for null', () => {
    expect(localizeError(null)).toBe('Something went wrong.');
  });

  it('returns custom fallback for null', () => {
    expect(localizeError(null, 'Custom')).toBe('Custom');
  });

  it('returns offline message for ApiError with status 0', () => {
    expect(localizeError(new ApiError('ignored', 0))).toBe('No internet connection.');
  });

  it('maps known error code to localized string (en)', () => {
    const err = new ApiError('fallback msg', 401, 'INVALID_CREDENTIALS');
    expect(localizeError(err)).toBe('Invalid username or password.');
  });

  it('falls back to backend message for unknown error code', () => {
    const err = new ApiError('Custom server message', 400, 'SOME_UNKNOWN_CODE');
    expect(localizeError(err)).toBe('Custom server message');
  });

  it('falls back to internal_server_error key for 5xx with generic message', () => {
    const err = new ApiError('Request failed with status 500.', 500, 'REQUEST_FAILED');
    expect(localizeError(err)).toBe('An unexpected server error occurred.');
  });

  it('does not expose Cloudflare origin text from 5xx ApiError messages', () => {
    const err = new ApiError(
      'The origin web server returned an invalid or incomplete response to Cloudflare.',
      520,
      'REQUEST_FAILED',
    );

    expect(localizeError(err)).toBe('An unexpected server error occurred.');
  });

  it('returns error.message for plain Error', () => {
    expect(localizeError(new Error('Plain error text'))).toBe('Plain error text');
  });

  it('does not expose Cloudflare origin text from plain Error messages', () => {
    expect(localizeError(new Error('The origin web server returned an invalid or incomplete response to Cloudflare.'))).toBe(
      'An unexpected server error occurred.',
    );
  });
});

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
