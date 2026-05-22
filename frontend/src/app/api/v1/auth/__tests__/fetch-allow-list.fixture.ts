/**
 * Allow-list constants for the no-debug-fetch-guard AST test.
 * Extend this list only when a new legitimate non-Core fetch target is added to
 * the BFF auth handlers. Each addition is a visible PR change.
 */

/** URL prefixes allowed in non-OAuth BFF auth handler fetch() calls. */
export const ALLOWED_PREFIXES = [
  "${CORE_API_URL}/",  // core API (template literal head)
  "https://api.pwnedpasswords.com/range/",  // HIBP k-anonymity range (only in range/[prefix]/route.ts)
] as const;

/**
 * Glob patterns excluded from the AST scan.
 * OAuth callback handlers legitimately fetch external providers.
 */
export const EXCLUDED_GLOBS = [
  "**/oauth/**/callback/**",
  "**/*.test.ts",
  "**/*.spec.ts",
] as const;

/**
 * The route file path that is allowed to fetch the HIBP range endpoint.
 * All other files are only allowed to use CORE_API_URL prefixed fetches.
 */
export const HIBP_ALLOWED_FILE_PATTERN = /check-password-breach[/\\]range[/\\]\[prefix\][/\\]route\.ts$/;
