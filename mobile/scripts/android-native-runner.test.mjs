import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeExpoRunAndroidArgs, parseExpoRunAndroidArgs } from './android-native-runner.mjs';

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
