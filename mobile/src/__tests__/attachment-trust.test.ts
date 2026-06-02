/* eslint-env jest */
import {
  sanitizeFilename,
  sanitizeFilenameForAiContext,
  sanitizeAttachmentForRender,
} from '../lib/attachment-trust';

describe('sanitizeFilename', () => {
  it('returns the filename unchanged when it has no unsafe chars', () => {
    expect(sanitizeFilename('photo.jpg')).toBe('photo.jpg');
  });

  it('strips control characters', () => {
    expect(sanitizeFilename('file\x00\x1f\x7fname.jpg')).toBe('filename.jpg');
  });

  it('strips path separators', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('....etcpasswd');
  });

  it('truncates names longer than 128 characters', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeFilename(long)).toHaveLength(128);
  });

  it('returns "attachment" when the cleaned name is empty', () => {
    expect(sanitizeFilename('\x00\x01\x02')).toBe('attachment');
  });
});

describe('sanitizeFilenameForAiContext', () => {
  it('wraps the sanitized filename in an UNTRUSTED marker', () => {
    expect(sanitizeFilenameForAiContext('photo.jpg')).toBe('<<UNTRUSTED filename="photo.jpg">>');
  });

  it('strips unsafe chars before wrapping', () => {
    expect(sanitizeFilenameForAiContext('bad\x00file.jpg')).toBe('<<UNTRUSTED filename="badfile.jpg">>');
  });
});

describe('sanitizeAttachmentForRender', () => {
  const valid = { url: 'https://cdn.example.com/photo.jpg', name: 'photo.jpg', mime: 'image/jpeg' };

  it('returns a SafeAttachment for a valid HTTPS attachment', () => {
    const result = sanitizeAttachmentForRender(valid);
    expect(result).not.toBeNull();
    expect(result?.url).toBe(valid.url);
    expect(result?.mime).toBe('image/jpeg');
    expect(result?.previewable).toBe(true);
  });

  it('returns null for non-HTTPS URLs', () => {
    expect(sanitizeAttachmentForRender({ ...valid, url: 'http://cdn.example.com/photo.jpg' })).toBeNull();
    expect(sanitizeAttachmentForRender({ ...valid, url: 'not-a-url' })).toBeNull();
  });

  it('normalizes unknown MIME types to application/octet-stream', () => {
    const result = sanitizeAttachmentForRender({ ...valid, mime: 'video/mp4' });
    expect(result?.mime).toBe('application/octet-stream');
    expect(result?.previewable).toBe(false);
  });

  it('marks PDFs as non-previewable', () => {
    const result = sanitizeAttachmentForRender({ ...valid, mime: 'application/pdf' });
    expect(result?.mime).toBe('application/pdf');
    expect(result?.previewable).toBe(false);
  });

  it('sanitizes the attachment filename', () => {
    const result = sanitizeAttachmentForRender({ ...valid, name: 'bad\x00file.jpg' });
    expect(result?.name).toBe('badfile.jpg');
  });
});
