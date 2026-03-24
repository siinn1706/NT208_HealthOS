/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0
 * Implements RFC 7636
 */

// ─── Base64 URL Encoding ────────────────────────────────────────────────────────
function base64URLEncode(buffer: Uint8Array): string {
  const chars = Array.from(buffer, (b) => String.fromCharCode(b)).join("");
  return btoa(chars)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// ─── Generate Code Verifier ─────────────────────────────────────────────────────
// Random 43-128 character string (RFC 7636 recommends 43 chars)
export async function generateCodeVerifier(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// ─── Generate Code Challenge ───────────────────────────────────────────────────
// SHA-256 hash of verifier, base64url encoded
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64URLEncode(new Uint8Array(digest));
}

// ─── Generate State ─────────────────────────────────────────────────────────────
// Random string for CSRF protection (16 bytes = ~21 chars base64url)
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// ─── Generate Nonce ─────────────────────────────────────────────────────────────
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}
