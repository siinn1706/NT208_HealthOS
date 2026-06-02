/* eslint-env jest */
import { safeImageUri } from '../utils/safe-image-uri';

describe('safeImageUri', () => {
  it('returns the URI for a valid https URL', () => {
    expect(safeImageUri('https://cdn.example.com/photo.jpg')).toBe('https://cdn.example.com/photo.jpg');
  });

  it('returns null for http URL', () => {
    expect(safeImageUri('http://example.com/photo.jpg')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(safeImageUri(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(safeImageUri(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(safeImageUri('')).toBeNull();
  });

  it('returns null for malformed URL', () => {
    expect(safeImageUri('not-a-url')).toBeNull();
  });

  it('returns null for custom scheme', () => {
    expect(safeImageUri('data:image/png;base64,abc')).toBeNull();
  });
});
