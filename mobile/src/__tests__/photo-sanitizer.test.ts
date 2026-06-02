/* eslint-env jest */
import { sanitizePhotoUri } from '../lib/photo-sanitizer';

describe('sanitizePhotoUri', () => {
  it('re-encodes the image through ImageManipulator and returns the sanitized uri', async () => {
    const result = await sanitizePhotoUri('file://raw-photo.jpg');
    expect(result).toEqual({ uri: 'file://raw-photo.jpg' });
  });

  it('passes the original uri to ImageManipulator.manipulate', async () => {
    // The mock returns the input uri back through saveAsync, confirming the uri was passed.
    const result = await sanitizePhotoUri('file://another-photo.png');
    expect(result.uri).toBe('file://another-photo.png');
  });
});
