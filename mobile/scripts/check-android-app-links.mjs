#!/usr/bin/env node
// Validates Android App Links env vars are present and well-formed.

const IS_CI = Boolean(process.env.CI);

function fail(message) {
  if (IS_CI) {
    console.error(`[check-android-app-links] ERROR: ${message}`);
    process.exit(1);
  } else {
    console.warn(`[check-android-app-links] WARNING (local): ${message}`);
  }
}

// e.g. com.example.app — must have at least two dotted segments
const PACKAGE_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*){1,}$/;

// Single SHA-256 fingerprint: 32 colon-separated uppercase hex pairs
const SHA256_FINGERPRINT_RE = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

let ok = true;

// ── Package name ─────────────────────────────────────────────────────────────
const packageName = (process.env.ANDROID_APP_LINK_PACKAGE_NAME ?? '').trim();
if (!packageName) {
  fail('ANDROID_APP_LINK_PACKAGE_NAME is not set.');
  ok = false;
} else if (!PACKAGE_NAME_RE.test(packageName)) {
  fail(
    `ANDROID_APP_LINK_PACKAGE_NAME="${packageName}" is not a valid Android package name ` +
    '(expected format: com.example.app).',
  );
  ok = false;
}

// ── Certificate fingerprints ─────────────────────────────────────────────────
const fingerprintsRaw = (process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS ?? '').trim();
if (!fingerprintsRaw) {
  fail('ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS is not set.');
  ok = false;
} else {
  // Accept a single fingerprint or a comma-separated list
  const fingerprints = fingerprintsRaw
    .split(',')
    .map((fp) => fp.trim().toUpperCase())
    .filter(Boolean);

  if (fingerprints.length === 0) {
    fail('ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS must contain at least one fingerprint.');
    ok = false;
  } else {
    for (const fp of fingerprints) {
      if (!SHA256_FINGERPRINT_RE.test(fp)) {
        fail(
          `ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS contains an invalid fingerprint: "${fp}". ` +
          'Expected format: AA:BB:CC:...(32 uppercase hex pairs separated by colons).',
        );
        ok = false;
        break;
      }
    }
    if (ok) {
      console.log(
        `[check-android-app-links] ${fingerprints.length} fingerprint(s) validated for package "${packageName}".`,
      );
    }
  }
}

if (!ok && IS_CI) {
  process.exit(1);
}
