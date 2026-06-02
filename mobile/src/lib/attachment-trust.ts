/**
 * attachment-trust.ts — boundary validation for user-supplied attachment
 * metadata before it reaches the renderer or an AI context string.
 *
 * Mobile mirror of frontend/src/lib/attachment-trust.ts.
 * Key difference: no process.env.NEXT_PUBLIC_CDN_ALLOWED_HOSTS — host
 * enforcement uses the CDN_ALLOWED_HOSTS constant below, which defaults to
 * an empty set (enforcement disabled) until Q5 is resolved.
 *
 * Security properties enforced:
 *  1. URL must be HTTPS
 *  2. Host allowlist (opt-in, empty = disabled)
 *  3. MIME allowlist — unknown types become application/octet-stream
 *  4. Filename sanitization — control chars / path separators stripped, max 128 chars
 *  5. AI context wrapping — <<UNTRUSTED>> marker for prompt-injection mitigation
 */

/**
 * Populate this set from your mobile config/env layer when Q5 (CDN allowlist)
 * is resolved.  An empty set disables host enforcement (permissive default).
 */
const CDN_ALLOWED_HOSTS: ReadonlySet<string> = new Set<string>(
  // e.g. ["cdn.healthos.vn", "assets.healthos.vn"]
);

/** Exhaustive list of MIME types the app can safely display or download. */
const ALLOWED_MIMES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

/** Subset of ALLOWED_MIMES that can be inline-previewed (image renderer). */
const PREVIEWABLE_MIMES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

export interface SafeAttachment {
  /** Validated HTTPS URL. */
  url: string;
  /** Sanitized filename — control chars and path separators removed, max 128 chars. */
  name: string;
  /**
   * Either the original MIME (if allowlisted) or "application/octet-stream".
   * Never an arbitrary user-supplied string.
   */
  mime: string;
  /** True only for known-safe image MIME types. */
  previewable: boolean;
}

/** Returns true iff `url` is a syntactically valid https:// URL. */
function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/**
 * Strip control characters (0x00–0x1F, 0x7F), null bytes, and filesystem path
 * separators from a filename.  Cap at 128 characters.
 * Returns "attachment" if the result would be empty.
 */
export function sanitizeFilename(name: string): string {
  // eslint-disable-next-line no-control-regex -- intentionally stripping control chars
  return name.replace(/[\x00-\x1f\x7f/\\]/g, "").slice(0, 128) || "attachment";
}

/**
 * Wrap a sanitized filename in an <<UNTRUSTED>> marker before injecting it
 * into an AI prompt.  Signals to the model that the value is user data, not a
 * trusted instruction (prompt-injection mitigation).
 *
 * Example: `<<UNTRUSTED filename="photo.jpg">>`
 */
export function sanitizeFilenameForAiContext(name: string): string {
  const safe = sanitizeFilename(name);
  return `<<UNTRUSTED filename="${safe}">>`;
}

/**
 * Validate and normalise an attachment object before rendering it in the UI.
 *
 * Returns `null` when the attachment must NOT be rendered.  Callers should
 * show a generic "unsupported attachment" chip instead.
 */
export function sanitizeAttachmentForRender(att: {
  url: string;
  name: string;
  mime: string;
}): SafeAttachment | null {
  if (!isHttpsUrl(att.url)) return null;

  const host = extractHostname(att.url);
  if (CDN_ALLOWED_HOSTS.size > 0 && !CDN_ALLOWED_HOSTS.has(host)) {
    console.warn("[attachment-trust] rejected non-allowlisted host:", host);
    return null;
  }

  const safeMime = ALLOWED_MIMES.has(att.mime)
    ? att.mime
    : "application/octet-stream";

  const previewable = PREVIEWABLE_MIMES.has(att.mime);

  return {
    url: att.url,
    name: sanitizeFilename(att.name),
    mime: safeMime,
    previewable,
  };
}
