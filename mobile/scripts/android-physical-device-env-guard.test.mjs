import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertPhysicalDeviceReachableEnv,
  findPhysicalDeviceBlockedUrls,
  findPhysicalDeviceInvalidUrls,
  findPhysicalDeviceMissingUrls,
  isPhysicalAndroidDevice,
  resolveExpoPublicUrlValues,
} from './android-physical-device-env-guard.mjs';

const physical = { id: 'R5CT12345', state: 'device' };
const emulator = { id: 'emulator-5554', state: 'device' };

function withTempProject(callback) {
  const root = mkdtempSync(join(tmpdir(), 'healthos-mobile-env-'));
  try {
    return callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('isPhysicalAndroidDevice distinguishes phones from emulators', () => {
  assert.equal(isPhysicalAndroidDevice(physical), true);
  assert.equal(isPhysicalAndroidDevice(emulator), false);
  assert.equal(isPhysicalAndroidDevice({ id: 'R5CT12345', state: 'offline' }), false);
});

test('resolveExpoPublicUrlValues lets process env override stale env files', () => withTempProject((root) => {
  writeFileSync(join(root, '.env'), 'EXPO_PUBLIC_CORE_API_URL=http://10.0.2.2:8000\n');

  assert.deepEqual(resolveExpoPublicUrlValues({
    projectRoot: root,
    env: { EXPO_PUBLIC_CORE_API_URL: '' },
  }), [
    { key: 'EXPO_PUBLIC_CORE_API_URL', value: '', source: 'process env' },
  ]);
}));

test('resolveExpoPublicUrlValues mirrors Expo development mode files and expansion', () => withTempProject((root) => {
  writeFileSync(join(root, '.env'), 'EXPO_PUBLIC_API_URL=http://192.168.1.10:3000\n');
  writeFileSync(join(root, '.env.development.local'), [
    'LOCAL_WEB_HOST=localhost',
    'EXPO_PUBLIC_WEB_APP_URL=http://${LOCAL_WEB_HOST}:3000',
  ].join('\n'));

  const values = resolveExpoPublicUrlValues({
    projectRoot: root,
    env: {},
  });

  assert.deepEqual(values.map(({ key, value }) => ({ key, value })), [
    { key: 'EXPO_PUBLIC_API_URL', value: 'http://192.168.1.10:3000' },
    { key: 'EXPO_PUBLIC_WEB_APP_URL', value: 'http://localhost:3000' },
  ]);
}));

test('resolveExpoPublicUrlValues uses process env during public-key expansion', () => withTempProject((root) => {
  writeFileSync(join(root, '.env.development.local'), [
    'EXPO_PUBLIC_CORE_API_URL=http://10.0.2.2:8000',
    'EXPO_PUBLIC_CORE_WS_URL=ws://192.168.1.10:8000',
    'EXPO_PUBLIC_WEB_APP_URL=${EXPO_PUBLIC_CORE_API_URL}',
  ].join('\n'));

  const env = {
    EXPO_PUBLIC_API_URL: 'http://192.168.1.10:3000',
    EXPO_PUBLIC_WS_URL: 'ws://192.168.1.10:8000',
    EXPO_PUBLIC_WEB_APP_URL: 'http://192.168.1.10:3000',
  };
  const values = resolveExpoPublicUrlValues({
    projectRoot: root,
    env,
  });

  assert.deepEqual(values.map(({ key, value }) => ({ key, value })), [
    { key: 'EXPO_PUBLIC_CORE_API_URL', value: 'http://10.0.2.2:8000' },
    { key: 'EXPO_PUBLIC_CORE_WS_URL', value: 'ws://192.168.1.10:8000' },
    { key: 'EXPO_PUBLIC_WEB_APP_URL', value: 'http://192.168.1.10:3000' },
    { key: 'EXPO_PUBLIC_API_URL', value: 'http://192.168.1.10:3000' },
    { key: 'EXPO_PUBLIC_WS_URL', value: 'ws://192.168.1.10:8000' },
  ]);
  assert.doesNotThrow(() => assertPhysicalDeviceReachableEnv({
    device: physical,
    projectRoot: root,
    env,
  }));
}));

test('findPhysicalDeviceBlockedUrls flags emulator and loopback URLs', () => {
  const blocked = findPhysicalDeviceBlockedUrls([
    { key: 'EXPO_PUBLIC_API_URL', value: 'http://10.0.2.2:3000', source: '.env' },
    { key: 'EXPO_PUBLIC_WS_URL', value: 'ws://192.168.1.10:8000', source: '.env' },
    { key: 'EXPO_PUBLIC_WEB_APP_URL', value: 'http://localhost:3000', source: '.env' },
  ]);

  assert.deepEqual(blocked.map((entry) => entry.key), [
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_WEB_APP_URL',
  ]);
});

test('findPhysicalDeviceInvalidUrls rejects invalid schemes and wildcard hosts', () => {
  const invalid = findPhysicalDeviceInvalidUrls([
    { key: 'EXPO_PUBLIC_API_URL', value: 'not-a-url', source: '.env' },
    { key: 'EXPO_PUBLIC_WS_URL', value: 'http://192.168.1.10:8000', source: '.env' },
    { key: 'EXPO_PUBLIC_WEB_APP_URL', value: 'ftp://192.168.1.10:3000', source: '.env' },
    { key: 'EXPO_PUBLIC_WEB_APP_URL', value: 'http://[::]:3000', source: '.env' },
  ]);

  assert.deepEqual(invalid.map(({ key, reason }) => ({ key, reason })), [
    { key: 'EXPO_PUBLIC_API_URL', reason: 'must be an absolute URL' },
    { key: 'EXPO_PUBLIC_WS_URL', reason: 'must use ws: or wss:' },
    { key: 'EXPO_PUBLIC_WEB_APP_URL', reason: 'must use http: or https:' },
    { key: 'EXPO_PUBLIC_WEB_APP_URL', reason: 'uses an emulator-only, loopback, or wildcard host' },
  ]);
});

test('findPhysicalDeviceMissingUrls flags blank and absent required URLs', () => {
  const missing = findPhysicalDeviceMissingUrls([
    { key: 'EXPO_PUBLIC_API_URL', value: '', source: '.env' },
    { key: 'EXPO_PUBLIC_WS_URL', value: 'ws://192.168.1.10:8000', source: '.env' },
  ]);

  assert.deepEqual(missing, [
    { key: 'EXPO_PUBLIC_API_URL', value: '', source: '.env' },
    { key: 'EXPO_PUBLIC_WEB_APP_URL', value: '', source: 'not set' },
  ]);
});

test('assertPhysicalDeviceReachableEnv fails fast for physical phone plus Expo mode env', () => withTempProject((root) => {
  writeFileSync(join(root, '.env.development.local'), [
    'LOCAL_BFF_HOST=10.0.2.2',
    'EXPO_PUBLIC_WS_URL=ws://192.168.1.10:8000',
    'EXPO_PUBLIC_WEB_APP_URL=http://192.168.1.10:3000',
    'EXPO_PUBLIC_API_URL=http://${LOCAL_BFF_HOST}:3000',
  ].join('\n'));

  assert.throws(
    () => assertPhysicalDeviceReachableEnv({ device: physical, projectRoot: root, env: {} }),
    /Physical Android device R5CT12345 needs explicit LAN[\s\S]*EXPO_PUBLIC_API_URL=http:\/\/10\.0\.2\.2:3000/,
  );
}));

test('assertPhysicalDeviceReachableEnv fails fast for malformed physical phone config', () => withTempProject((root) => {
  writeFileSync(join(root, '.env'), [
    'EXPO_PUBLIC_API_URL=not-a-url',
    'EXPO_PUBLIC_WS_URL=http://192.168.1.10:8000',
    'EXPO_PUBLIC_WEB_APP_URL=ftp://192.168.1.10:3000',
  ].join('\n'));

  assert.throws(
    () => assertPhysicalDeviceReachableEnv({ device: physical, projectRoot: root, env: {} }),
    /EXPO_PUBLIC_API_URL=not-a-url[\s\S]*must be an absolute URL[\s\S]*EXPO_PUBLIC_WS_URL=http:\/\/192\.168\.1\.10:8000[\s\S]*must use ws: or wss:[\s\S]*EXPO_PUBLIC_WEB_APP_URL=ftp:\/\/192\.168\.1\.10:3000[\s\S]*must use http: or https:/,
  );
}));

test('assertPhysicalDeviceReachableEnv fails fast for blank physical phone config', () => withTempProject((root) => {
  writeFileSync(join(root, '.env'), [
    'EXPO_PUBLIC_API_URL=',
    'EXPO_PUBLIC_WS_URL=ws://192.168.1.10:8000',
    'EXPO_PUBLIC_WEB_APP_URL=http://192.168.1.10:3000',
  ].join('\n'));

  assert.throws(
    () => assertPhysicalDeviceReachableEnv({ device: physical, projectRoot: root, env: {} }),
    /EXPO_PUBLIC_API_URL is blank or missing[\s\S]*Blank values can fall back to emulator-only 10\.0\.2\.2/,
  );
}));

test('assertPhysicalDeviceReachableEnv fails fast for missing physical phone config', () => withTempProject((root) => {
  writeFileSync(join(root, '.env'), 'EXPO_PUBLIC_API_URL=http://192.168.1.10:3000\n');

  assert.throws(
    () => assertPhysicalDeviceReachableEnv({ device: physical, projectRoot: root, env: {} }),
    /EXPO_PUBLIC_WS_URL is blank or missing[\s\S]*EXPO_PUBLIC_WEB_APP_URL is blank or missing/,
  );
}));

test('assertPhysicalDeviceReachableEnv allows explicit LAN physical phone config', () => withTempProject((root) => {
  writeFileSync(join(root, '.env'), [
    'EXPO_PUBLIC_API_URL=http://192.168.1.10:3000',
    'EXPO_PUBLIC_WS_URL=ws://192.168.1.10:8000',
    'EXPO_PUBLIC_WEB_APP_URL=http://192.168.1.10:3000',
  ].join('\n'));

  assert.doesNotThrow(() => assertPhysicalDeviceReachableEnv({ device: physical, projectRoot: root, env: {} }));
}));

test('assertPhysicalDeviceReachableEnv allows emulator 10.0.2.2 config', () => withTempProject((root) => {
  writeFileSync(join(root, '.env'), 'EXPO_PUBLIC_API_URL=http://10.0.2.2:3000\n');

  assert.doesNotThrow(() => assertPhysicalDeviceReachableEnv({ device: emulator, projectRoot: root, env: {} }));
}));
