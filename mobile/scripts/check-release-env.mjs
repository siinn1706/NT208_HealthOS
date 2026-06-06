#!/usr/bin/env node
// Validates that all required production env vars are present and well-formed.
// Exits non-zero in CI; warns locally (process.env.CI distinguishes the two).

const IS_CI = Boolean(process.env.CI);

function fail(message) {
  if (IS_CI) {
    console.error(`[check-release-env] ERROR: ${message}`);
    process.exit(1);
  } else {
    console.warn(`[check-release-env] WARNING (local): ${message}`);
  }
}

function requireHttpsUrl(varName) {
  const value = (process.env[varName] ?? '').trim();
  if (!value) {
    fail(`${varName} is not set.`);
    return false;
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${varName}="${value}" is not a valid absolute URL.`);
    return false;
  }
  if (parsed.protocol !== 'https:') {
    fail(`${varName} must use HTTPS (got "${parsed.protocol}").`);
    return false;
  }
  return true;
}

function requireBffHost(varName) {
  const value = (process.env[varName] ?? '').trim();
  const allowlist = (process.env.MOBILE_API_BFF_ALLOWED_HOSTS ?? 'healthos.page')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!value) return true; // handled by requireHttpsUrl
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (!allowlist.includes(hostname)) {
      const allowed = allowlist.join(', ');
      fail(`${varName}: URL hostname "${hostname}" is not in MOBILE_API_BFF_ALLOWED_HOSTS allowlist. Allowed: ${allowed}. The mobile API URL must point at the BFF gateway.`);
      return false;
    }
  } catch {
    return true; // validation handled by requireHttpsUrl
  }
  return true;
}

function requireWssUrl(varName) {
  const value = (process.env[varName] ?? '').trim();
  if (!value) {
    fail(`${varName} is not set.`);
    return false;
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${varName}="${value}" is not a valid absolute URL.`);
    return false;
  }
  if (parsed.protocol !== 'wss:') {
    fail(`${varName} must use WSS (got "${parsed.protocol}").`);
    return false;
  }
  return true;
}

function requireAppLinkUrl(varName) {
  const value = (process.env[varName] ?? '').trim();
  if (!value) {
    fail(`${varName} is not set.`);
    return false;
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${varName}="${value}" is not a valid absolute URL.`);
    return false;
  }
  // nt208:// scheme is local-dev only — not valid for production release
  if (parsed.protocol === 'nt208:') {
    fail(`${varName} must not use the local "nt208:" scheme for production.`);
    return false;
  }
  if (parsed.protocol !== 'https:') {
    fail(`${varName} must use HTTPS for Android App Links (got "${parsed.protocol}").`);
    return false;
  }
  if (!parsed.hostname) {
    fail(`${varName} must have a hostname.`);
    return false;
  }
  if (parsed.port) {
    fail(`${varName} must not include a port (got "${parsed.port}"). Production App Links require a standard HTTPS URL.`);
    return false;
  }
  if (parsed.username || parsed.password) {
    fail(`${varName} must not contain credentials.`);
    return false;
  }
  return true;
}

// Resolve EXPO_PUBLIC_WS_URL with fallback to legacy EXPO_PUBLIC_CORE_WS_URL.
// Warn if only the legacy key is set so operators know to migrate.
const wsUrl = (process.env.EXPO_PUBLIC_WS_URL ?? '').trim();
const legacyWsUrl = (process.env.EXPO_PUBLIC_CORE_WS_URL ?? '').trim();
const resolvedWsKey = wsUrl ? 'EXPO_PUBLIC_WS_URL' : (legacyWsUrl ? 'EXPO_PUBLIC_CORE_WS_URL' : 'EXPO_PUBLIC_WS_URL');
if (!wsUrl && legacyWsUrl) {
  console.warn('[check-release-env] WARNING: EXPO_PUBLIC_CORE_WS_URL is deprecated — rename to EXPO_PUBLIC_WS_URL before next release.');
}

// Resolve EXPO_PUBLIC_API_URL with fallback to legacy EXPO_PUBLIC_CORE_API_URL.
// The API URL must point at the BFF gateway, never directly at Core port 8000.
const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
const legacyApiUrl = (process.env.EXPO_PUBLIC_CORE_API_URL ?? '').trim();
const resolvedApiKey = apiUrl
  ? 'EXPO_PUBLIC_API_URL'
  : (legacyApiUrl ? 'EXPO_PUBLIC_CORE_API_URL' : 'EXPO_PUBLIC_API_URL');
if (!apiUrl && legacyApiUrl) {
  console.warn('[check-release-env] WARNING: EXPO_PUBLIC_CORE_API_URL is deprecated — rename to EXPO_PUBLIC_API_URL (must point at BFF, not Core).');
}

let ok = true;
ok = requireHttpsUrl(resolvedApiKey) && ok;
ok = requireBffHost(resolvedApiKey) && ok;
ok = requireWssUrl(resolvedWsKey) && ok;
ok = requireHttpsUrl('EXPO_PUBLIC_WEB_APP_URL') && ok;
ok = requireAppLinkUrl('EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI') && ok;

if (ok) {
  console.log('[check-release-env] All release env vars valid.');
}
