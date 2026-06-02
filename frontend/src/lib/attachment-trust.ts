/**
 * attachment-trust.ts — boundary validation for user-supplied attachment
 * metadata before it reaches the renderer or an AI context string.
 *
 * Security properties enforced:
 *  1. URL must be HTTPS — prevents IP exfil via http:// and all non-http
 *     schemes (data:, blob:, javascript:, etc.)
 *  2. Host allowlist — when NEXT_PUBLIC_CDN_ALLOWED_HOSTS is set, only hosts
 *     on that list are rendered.  Non-allowlisted hosts log a warning and
 *     return null.  (Q5: allowlist is still open — the env var default is ""
 *     which disables host enforcement until the list is confirmed.)
 *  3. MIME allowlist — arbitrary content types are replaced with
 *     application/octet-stream; only known-safe image types become previewable.
 *  4. Filename sanitization — control characters, null bytes, and path
 *     separators are stripped; length is capped at 128 chars.
 *  5. AI context wrapping — filenames injected into AI prompts are tagged with
 *     an <<UNTRUSTED>> marker so the model treats them as untrusted data, not
 *     instructions (prompt-injection mitigation).
 */

const ALLOWED_HOSTS: ReadonlySet<string> = new Set(
  (process.env.NEXT_PUBLIC_CDN_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean),
);

/** Exhaustive list of MIME types the app can safely display or download. */
const ALLOWED_MIMES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

/** Subset of ALLOWED_MIMES that the browser can safely inline-preview. */
const PREVIEWABLE_MIMES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

export interface SafeAttachment {
  /** Validated HTTPS URL — guaranteed to pass isHttpsUrl check. */
  url: string;
  /** Sanitized filename — control chars and path separators removed, max 128 chars. */
  name: string;
  /**
   * Either the original MIME (if allowlisted) or "application/octet-stream".
   * Never an arbitrary user-supplied string.
   */
  mime: string;
  /** True only for known-safe image MIME types the browser can inline. */
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
 * separators from a filename.  Cap at 128 characters to prevent log injection
 * and UI overflow.  Returns "attachment" if the result would be empty.
 */
export function sanitizeFilename(name: string): string {
  // eslint-disable-next-line no-control-regex -- intentionally stripping control chars
  return name.replace(/[\x00-\x1f\x7f/\\]/g, "").slice(0, 128) || "attachment";
}

/**
 * Wrap a sanitized filename in an <<UNTRUSTED>> marker before injecting it
 * into an AI prompt.  This signals to the model that the value is user data,
 * not a trusted instruction, reducing prompt-injection attack surface.
 *
 * Example output: `<<UNTRUSTED filename="photo.jpg">>`
 */
export function sanitizeFilenameForAiContext(name: string): string {
  const safe = sanitizeFilename(name);
  return `<<UNTRUSTED filename="${safe}">>`;
}

/**
 * Validate and normalise an attachment object received from the API before
 * rendering it in the UI.
 *
 * Returns `null` when the attachment must NOT be rendered (non-HTTPS URL, or
 * non-allowlisted host when host enforcement is active).  Callers should show
 * a generic "unsupported attachment" chip in place of `null`.
 */
export function sanitizeAttachmentForRender(att: {
  url: string;
  name: string;
  mime: string;
}): SafeAttachment | null {
  // Reject non-HTTPS URLs unconditionally.
  if (!isHttpsUrl(att.url)) return null;

  // When the CDN allowlist is populated, reject any host not on it.
  const host = extractHostname(att.url);
  if (ALLOWED_HOSTS.size > 0 && !ALLOWED_HOSTS.has(host)) {
    // Log at warn level so ops can detect unexpected CDN origins without
    // surfacing raw attachment data to the console in production builds.
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
