export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ALLOWED_IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_DOCUMENT_MIME = ['application/pdf', ...ALLOWED_IMAGE_MIME] as const;
export const ALLOWED_DOCUMENT_EXT = ['pdf', ...ALLOWED_IMAGE_EXT] as const;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export interface FileLike {
  uri: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
}

export interface ValidationResult {
  ok: boolean;
  reason?: 'TOO_LARGE' | 'BAD_MIME' | 'BAD_EXTENSION' | 'NO_URI' | 'BAD_URI';
  messageKey?: string;
  messageParams?: Record<string, string | number>;
  message?: string;
}

interface FileValidationRules {
  allowedMime: readonly string[];
  allowedExt: readonly string[];
  maxBytes: number;
  kind: 'image' | 'document';
}

function validationMessageKey(kind: FileValidationRules['kind'], reason: NonNullable<ValidationResult['reason']>) {
  return `validation.${kind}.${reason.toLowerCase()}`;
}

function extensionFrom(file: FileLike) {
  const candidate = file.fileName ?? file.uri;
  const cleanName = candidate.split('?')[0]?.split('#')[0]?.split(/[\\/]/).pop();
  const dotIndex = cleanName?.lastIndexOf('.') ?? -1;
  if (!cleanName || dotIndex <= 0 || dotIndex === cleanName.length - 1) return undefined;
  return cleanName.slice(dotIndex + 1).toLowerCase();
}

function hasAllowedLocalUri(uri: string) {
  return /^(file|content|asset-library):\/\//i.test(uri);
}

function validateFile(file: FileLike | null | undefined, rules: FileValidationRules): ValidationResult {
  if (!file?.uri?.trim()) {
    return { ok: false, reason: 'NO_URI', messageKey: validationMessageKey(rules.kind, 'NO_URI'), message: 'No file selected.' };
  }

  if (!hasAllowedLocalUri(file.uri.trim())) {
    return { ok: false, reason: 'BAD_URI', messageKey: validationMessageKey(rules.kind, 'BAD_URI'), message: 'Select a local file from this device.' };
  }

  if (file.fileSize != null && file.fileSize > rules.maxBytes) {
    return {
      ok: false,
      reason: 'TOO_LARGE',
      messageKey: validationMessageKey(rules.kind, 'TOO_LARGE'),
      messageParams: { maxMb: rules.maxBytes / 1024 / 1024 },
      message: `File larger than ${rules.maxBytes / 1024 / 1024}MB.`,
    };
  }

  const mimeType = file.mimeType?.trim().toLowerCase();
  const ext = extensionFrom(file);

  if (mimeType && !rules.allowedMime.includes(mimeType)) {
    return { ok: false, reason: 'BAD_MIME', messageKey: validationMessageKey(rules.kind, 'BAD_MIME'), message: 'Unsupported file type.' };
  }

  if (ext && !rules.allowedExt.includes(ext)) {
    return { ok: false, reason: 'BAD_EXTENSION', messageKey: validationMessageKey(rules.kind, 'BAD_EXTENSION'), message: 'Unsupported file extension.' };
  }

  if (!mimeType && !ext) {
    return { ok: false, reason: 'BAD_EXTENSION', messageKey: validationMessageKey(rules.kind, 'BAD_EXTENSION'), message: 'Unsupported file extension.' };
  }

  return { ok: true };
}

export function validateImageFile(file: FileLike | null | undefined): ValidationResult {
  return validateFile(file, {
    allowedMime: ALLOWED_IMAGE_MIME,
    allowedExt: ALLOWED_IMAGE_EXT,
    maxBytes: MAX_IMAGE_BYTES,
    kind: 'image',
  });
}

export function validateDocumentFile(file: FileLike | null | undefined): ValidationResult {
  return validateFile(file, {
    allowedMime: ALLOWED_DOCUMENT_MIME,
    allowedExt: ALLOWED_DOCUMENT_EXT,
    maxBytes: MAX_DOCUMENT_BYTES,
    kind: 'document',
  });
}
