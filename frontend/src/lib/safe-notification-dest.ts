/**
 * Validates a notification `link`/`href` destination before navigating.
 *
 * Backend `Notification.link` is user-influenced data; if a malicious or
 * compromised producer ever stamps `javascript:`, `data:`, `vbscript:`,
 * `file:`, scheme-relative `//evil.com`, or a cross-origin URL, the receiving
 * client must reject it. This helper centralises that gate so every notification
 * call site (popover, full list, future widgets) shares one source of truth.
 */
export function isSafeNotificationDest(dest: string): boolean {
  if (typeof dest !== "string" || dest.length === 0) return false;

  // Reject scheme-relative URLs ("//evil.com") and obvious dangerous schemes
  // before parsing — `new URL("javascript:alert(1)", origin)` happily resolves
  // to the javascript URL with the host set to the page origin, which is the
  // exact case we need to defeat.
  const trimmed = dest.trim();
  if (trimmed.startsWith("//")) return false;
  const lowered = trimmed.toLowerCase();
  if (
    lowered.startsWith("javascript:") ||
    lowered.startsWith("data:") ||
    lowered.startsWith("vbscript:") ||
    lowered.startsWith("file:")
  ) {
    return false;
  }

  // Path-relative (starts with `/` but not `//`) is always same-origin.
  if (trimmed.startsWith("/")) return true;

  // Absolute URL: require same-origin http(s).
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(trimmed, window.location.origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}
