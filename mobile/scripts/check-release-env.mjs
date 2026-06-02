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

let ok = true;
ok = requireHttpsUrl('EXPO_PUBLIC_CORE_API_URL') && ok;
ok = requireWssUrl('EXPO_PUBLIC_CORE_WS_URL') && ok;
ok = requireHttpsUrl('EXPO_PUBLIC_WEB_APP_URL') && ok;
ok = requireAppLinkUrl('EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI') && ok;

if (ok) {
  console.log('[check-release-env] All release env vars valid.');
}
