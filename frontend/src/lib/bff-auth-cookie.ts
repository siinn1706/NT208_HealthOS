const DEFAULT_COOKIE_NAME = "healthos.session";
const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * httpOnly companion cookie carrying non-sensitive session metadata
 * (`onboarding_status`). It is httpOnly so it can't be tampered with from JS;
 * the only consumer is `src/proxy.ts`, which runs server-side and reads
 * httpOnly cookies just fine. Using a separate cookie keeps the session token
 * unchanged when only the onboarding status flips.
 */
export const META_COOKIE_NAME = "healthos.meta";

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export const SESSION_COOKIE_NAME = process.env.COOKIE_NAME?.trim() || DEFAULT_COOKIE_NAME;

export const SESSION_COOKIE_MAX_AGE =
  parsePositiveInt(process.env.COOKIE_MAX_AGE) ?? DEFAULT_COOKIE_MAX_AGE;

/**
 * Whether to set the `secure` flag on the session cookie.
 * When unset, defaults to true (secure) for production-safe behavior.
 * To disable for local HTTP, use any common “off” value: false, 0, off, no (case-insensitive).
 */
function disablesSecureCookieFlag(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const v = raw.trim().toLowerCase();
  return (
    v === "false" ||
    v === "0" ||
    v === "off" ||
    v === "no" ||
    v === ""
  );
}

export const SESSION_COOKIE_SECURE = !disablesSecureCookieFlag(
  process.env.COOKIE_SECURE,
);
