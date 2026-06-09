// Unit tests for check-release-env.mjs — drives the script as a child process
// with controlled environment variables and asserts exit code + output.
//
// Usage: node --test mobile/scripts/check-release-env.test.mjs

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, 'check-release-env.mjs');

function runScript(env) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT], {
      env: { ...process.env, CI: '1', ...env },
      encoding: 'utf8',
      maxBuffer: 1024 * 64,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      code: err.status ?? 1,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
    };
  }
}

describe('check-release-env.mjs', () => {
  it('passes with canonical-only vars', () => {
    const { code, stdout, stderr } = runScript({
      EXPO_PUBLIC_API_URL: 'https://healthos.shop',
      EXPO_PUBLIC_WS_URL: 'wss://healthos.shop',
      EXPO_PUBLIC_WEB_APP_URL: 'https://healthos.shop',
      EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI: 'https://healthos.shop/auth/oauth/mobile-callback',
    });
    assert.equal(code, 0, `expected exit 0, got ${code}\nstderr: ${stderr}`);
    assert.match(stdout, /All release env vars valid/);
  });

  it('passes with legacy-only vars (deprecation warning)', () => {
    const { code, stdout, stderr } = runScript({
      EXPO_PUBLIC_CORE_API_URL: 'https://healthos.shop',
      EXPO_PUBLIC_CORE_WS_URL: 'wss://healthos.shop',
      EXPO_PUBLIC_WEB_APP_URL: 'https://healthos.shop',
      EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI: 'https://healthos.shop/auth/oauth/mobile-callback',
    });
    assert.equal(code, 0, `expected exit 0, got ${code}\nstderr: ${stderr}`);
    assert.match(stdout, /EXPO_PUBLIC_CORE_API_URL is deprecated/);
    assert.match(stdout, /All release env vars valid/);
  });

  it('fails when both API and WS URLs are missing', () => {
    const { code, stdout, stderr } = runScript({
      EXPO_PUBLIC_WEB_APP_URL: 'https://healthos.shop',
      EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI: 'https://healthos.shop/auth/oauth/mobile-callback',
    });
    assert.notEqual(code, 0, `expected non-zero exit, got ${code}`);
    assert.match(stderr, /EXPO_PUBLIC_API_URL is not set/);
  });

  it('fails when API URL hostname is not in allowlist', () => {
    const { code, stderr } = runScript({
      EXPO_PUBLIC_API_URL: 'https://core-be.internal:443',
      EXPO_PUBLIC_WS_URL: 'wss://healthos.shop',
      EXPO_PUBLIC_WEB_APP_URL: 'https://healthos.shop',
      EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI: 'https://healthos.shop/auth/oauth/mobile-callback',
    });
    assert.notEqual(code, 0, `expected non-zero exit, got ${code}`);
    assert.match(stderr, /MOBILE_API_BFF_ALLOWED_HOSTS/);
  });

  it('passes when allowlist env is missing (defaults to healthos.shop)', () => {
    const env = {
      EXPO_PUBLIC_API_URL: 'https://healthos.shop',
      EXPO_PUBLIC_WS_URL: 'wss://healthos.shop',
      EXPO_PUBLIC_WEB_APP_URL: 'https://healthos.shop',
      EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI: 'https://healthos.shop/auth/oauth/mobile-callback',
    };
    // Explicitly unset MOBILE_API_BFF_ALLOWED_HOSTS
    delete env.MOBILE_API_BFF_ALLOWED_HOSTS;
    const { code, stdout } = runScript(env);
    assert.equal(code, 0, `expected exit 0, got ${code}`);
    assert.match(stdout, /All release env vars valid/);
  });
});
