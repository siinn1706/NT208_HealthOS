// Unit tests for check-release-env.mjs — drives the script as a child process
// with controlled environment variables and asserts exit code + output.
//
// Usage: node --test mobile/scripts/check-release-env.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, 'check-release-env.mjs');
const RELEASE_ENV_KEYS = [
  'CHECK_RELEASE_ENV_PROJECT_ROOT',
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_CORE_API_URL',
  'EXPO_PUBLIC_WS_URL',
  'EXPO_PUBLIC_CORE_WS_URL',
  'EXPO_PUBLIC_WEB_APP_URL',
  'EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI',
  'MOBILE_API_BFF_ALLOWED_HOSTS',
];

function runScript(env, options = {}) {
  const childEnv = { ...process.env, ...env };
  let tempRoot = null;
  for (const key of RELEASE_ENV_KEYS) {
    delete childEnv[key];
  }
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete childEnv[key];
    } else {
      childEnv[key] = value;
    }
  }
  if (!childEnv.CHECK_RELEASE_ENV_PROJECT_ROOT) {
    tempRoot = mkdtempSync(join(tmpdir(), 'nt208-release-env-empty-'));
    childEnv.CHECK_RELEASE_ENV_PROJECT_ROOT = tempRoot;
  }
  if (options.ci === false) {
    delete childEnv.CI;
  } else {
    childEnv.CI = '1';
  }

  try {
    const result = spawnSync(process.execPath, [SCRIPT, ...(options.args ?? [])], {
      env: childEnv,
      encoding: 'utf8',
      maxBuffer: 1024 * 64,
    });
    return {
      code: result.status ?? 1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  } finally {
    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  }
}

function withTempProject(callback) {
  const root = mkdtempSync(join(tmpdir(), 'nt208-release-env-'));
  try {
    return callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
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
    assert.match(stderr, /EXPO_PUBLIC_CORE_API_URL is deprecated/);
    assert.match(stderr, /EXPO_PUBLIC_CORE_WS_URL is deprecated/);
    assert.match(stdout, /All release env vars valid/);
  });

  it('loads production Expo env files before validating release vars', () => withTempProject((root) => {
    writeFileSync(join(root, '.env.production.local'), [
      'EXPO_PUBLIC_API_URL=https://healthos.shop',
      'EXPO_PUBLIC_WS_URL=wss://healthos.shop',
      'EXPO_PUBLIC_WEB_APP_URL=https://healthos.io.vn',
      'EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI=https://healthos.io.vn/auth/oauth/mobile-callback',
      'MOBILE_API_BFF_ALLOWED_HOSTS=healthos.shop',
    ].join('\n'));

    const { code, stdout, stderr } = runScript({ CHECK_RELEASE_ENV_PROJECT_ROOT: root });
    assert.equal(code, 0, `expected exit 0, got ${code}\nstderr: ${stderr}`);
    assert.match(stdout, /All release env vars valid/);
  }));

  it('fails when both API and WS URLs are missing', () => {
    const { code, stdout, stderr } = runScript({
      EXPO_PUBLIC_WEB_APP_URL: 'https://healthos.shop',
      EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI: 'https://healthos.shop/auth/oauth/mobile-callback',
    });
    assert.notEqual(code, 0, `expected non-zero exit, got ${code}`);
    assert.match(stderr, /EXPO_PUBLIC_API_URL is not set/);
  });

  it('fails in strict mode even outside CI', () => {
    const { code, stderr } = runScript({
      EXPO_PUBLIC_WEB_APP_URL: 'https://healthos.shop',
      EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI: 'https://healthos.shop/auth/oauth/mobile-callback',
    }, { args: ['--strict'], ci: false });
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
