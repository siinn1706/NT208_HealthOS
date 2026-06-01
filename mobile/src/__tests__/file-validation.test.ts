/* eslint-env jest */
import {
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  validateDocumentFile,
  validateImageFile,
} from '../utils/file-validation';

describe('file validation', () => {
  it('accepts local image files with matching mime, extension, and size', () => {
    expect(validateImageFile({
      uri: 'file:///cache/meal.jpg',
      fileName: 'meal.jpg',
      mimeType: 'image/jpeg',
      fileSize: MAX_IMAGE_BYTES,
    })).toEqual({ ok: true });
  });

  it('rejects remote image URIs before upload', () => {
    expect(validateImageFile({
      uri: 'https://example.com/meal.jpg',
      fileName: 'meal.jpg',
      mimeType: 'image/jpeg',
    })).toMatchObject({ ok: false, reason: 'BAD_URI', messageKey: 'validation.image.bad_uri' });
  });

  it('rejects image mime, extension, and size mismatches', () => {
    expect(validateImageFile({
      uri: 'file:///cache/meal.gif',
      fileName: 'meal.gif',
      mimeType: 'image/gif',
    })).toMatchObject({ ok: false, reason: 'BAD_MIME' });

    expect(validateImageFile({
      uri: 'file:///cache/meal.txt',
      fileName: 'meal.txt',
      mimeType: 'image/jpeg',
    })).toMatchObject({ ok: false, reason: 'BAD_EXTENSION' });

    expect(validateImageFile({
      uri: 'file:///cache/meal.jpg',
      fileName: 'meal.jpg',
      mimeType: 'image/jpeg',
      fileSize: MAX_IMAGE_BYTES + 1,
    })).toMatchObject({ ok: false, reason: 'TOO_LARGE' });
  });

  it('accepts picker assets with one supported type signal', () => {
    expect(validateImageFile({
      uri: 'content://images/selected',
      mimeType: 'image/png',
    })).toEqual({ ok: true });

    expect(validateDocumentFile({
      uri: 'content://documents/selected',
      fileName: 'rx.pdf',
    })).toEqual({ ok: true });
  });

  it('validates document uploads separately from image-only uploads', () => {
    expect(validateDocumentFile({
      uri: 'content://documents/rx.pdf',
      fileName: 'rx.pdf',
      mimeType: 'application/pdf',
      fileSize: MAX_DOCUMENT_BYTES,
    })).toEqual({ ok: true });

    expect(validateDocumentFile({
      uri: 'content://documents/rx.exe',
      fileName: 'rx.exe',
      mimeType: 'application/octet-stream',
    })).toMatchObject({ ok: false, reason: 'BAD_MIME' });
  });
});
