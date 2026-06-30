import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeExpoRunAndroidArgs,
  parseExpoRunAndroidArgs,
  resolveExpoRunAndroidLaunch,
  shouldUseAdbReversePackagerHost,
} from './android-native-runner.mjs';

test('normalizeExpoRunAndroidArgs preserves explicit device flags', () => {
  assert.deepEqual(
    normalizeExpoRunAndroidArgs(['--no-bundler', '-d', 'emulator-5554']),
    ['--no-bundler', '-d', 'emulator-5554'],
  );
  assert.deepEqual(
    normalizeExpoRunAndroidArgs(['--device', '192.168.1.25:5555']),
    ['--device', '192.168.1.25:5555'],
  );
});

test('normalizeExpoRunAndroidArgs treats bare ADB ids as devices, not Expo project dirs', () => {
  assert.deepEqual(
    normalizeExpoRunAndroidArgs(['emulator-5554']),
    [],
  );
  assert.deepEqual(
    normalizeExpoRunAndroidArgs(['--no-bundler', '192.168.1.25:5555']),
    ['--no-bundler'],
  );
});

test('normalizeExpoRunAndroidArgs drops separator sent by shell wrappers', () => {
  assert.deepEqual(
    normalizeExpoRunAndroidArgs(['--', '--no-bundler', 'emulator-5554']),
    ['--no-bundler'],
  );
});

test('parseExpoRunAndroidArgs extracts ADB serial for ANDROID_SERIAL', () => {
  assert.deepEqual(
    parseExpoRunAndroidArgs(['--no-bundler', 'emulator-5554']),
    { expoArgs: ['--no-bundler'], adbSerial: 'emulator-5554' },
  );
});

test('resolveExpoRunAndroidLaunch uses ADB reverse Metro host for physical devices', () => {
  const device = { id: 'd31ee0fd', state: 'device' };
  const launch = resolveExpoRunAndroidLaunch({
    env: {},
    args: ['--no-build-cache'],
    device,
  });

  assert.deepEqual(launch.expoArgs, ['--no-build-cache']);
  assert.equal(launch.childEnv.ANDROID_SERIAL, 'd31ee0fd');
  assert.equal(launch.childEnv.REACT_NATIVE_PACKAGER_HOSTNAME, '127.0.0.1');
  assert.equal(launch.usesAdbReversePackagerHost, true);
});

test('resolveExpoRunAndroidLaunch preserves explicit Metro host overrides', () => {
  const device = { id: 'd31ee0fd', state: 'device' };

  assert.equal(
    shouldUseAdbReversePackagerHost({
      env: { REACT_NATIVE_PACKAGER_HOSTNAME: '192.168.1.22' },
      device,
    }),
    false,
  );
  assert.equal(
    shouldUseAdbReversePackagerHost({
      env: { EXPO_PACKAGER_PROXY_URL: 'http://192.168.1.22:8081' },
      device,
    }),
    false,
  );
});

test('resolveExpoRunAndroidLaunch keeps emulator Metro host unchanged', () => {
  const launch = resolveExpoRunAndroidLaunch({
    env: {},
    args: ['--no-install'],
    device: { id: 'emulator-5554', state: 'device' },
  });

  assert.deepEqual(launch.expoArgs, ['--no-install']);
  assert.equal(launch.childEnv.REACT_NATIVE_PACKAGER_HOSTNAME, undefined);
  assert.equal(launch.usesAdbReversePackagerHost, false);
});
