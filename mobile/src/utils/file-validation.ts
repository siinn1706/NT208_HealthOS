export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ALLOWED_IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface FileLike {
  uri: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
}

export interface ValidationResult {
  ok: boolean;
  reason?: 'TOO_LARGE' | 'BAD_MIME' | 'BAD_EXTENSION' | 'NO_URI';
  message?: string;
}

export function validateImageFile(file: FileLike | null | undefined): ValidationResult {
  if (!file?.uri) return { ok: false, reason: 'NO_URI', message: 'No file selected.' };

  if (file.fileSize != null && file.fileSize > MAX_IMAGE_BYTES) {
    return { ok: false, reason: 'TOO_LARGE', message: `Image larger than ${MAX_IMAGE_BYTES / 1024 / 1024}MB.` };
  }

  if (file.mimeType && !(ALLOWED_IMAGE_MIME as readonly string[]).includes(file.mimeType)) {
    return { ok: false, reason: 'BAD_MIME', message: 'Only JPEG, PNG, or WebP allowed.' };
  }

  const name = file.fileName ?? file.uri;
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext && !(ALLOWED_IMAGE_EXT as readonly string[]).includes(ext)) {
    return { ok: false, reason: 'BAD_EXTENSION', message: 'Only .jpg, .png, .webp allowed.' };
  }

  return { ok: true };
}
