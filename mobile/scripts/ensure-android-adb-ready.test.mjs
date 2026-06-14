import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';

import {
  isTcpTransport,
  onlineDevice,
  output,
  parseAvdList,
  parseDevices,
  resolveAndroidSdkPath,
  resolveAndroidTool,
  selectAvd,
} from './android-adb-launch-helpers.mjs';
import { prepareAndroidDevice } from './android-adb-emulator-preflight.mjs';
import { startExpoGoAndroid } from './android-expo-go-launcher.mjs';

const ok = (stdout = '', stderr = '') => ({ status: 0, stdout, stderr });
const failed = (stderr = '') => ({ status: 1, stdout: '', stderr });
const failWithError = (message, result) => {
  throw new Error(result ? `${message}\n${output(result)}` : message);
};

test('parseDevices keeps adb id and state only', () => {
  const devices = parseDevices(`List of devices attached
emulator-5554 offline transport_id:1
192.168.1.50:5555 device product:sdk model:Pixel_8
`);

  assert.deepEqual(devices, [
    { id: 'emulator-5554', state: 'offline' },
    { id: '192.168.1.50:5555', state: 'device' },
  ]);
});

test('parseAvdList ignores informational lines with spaces', () => {
  const avds = parseAvdList(`Pixel_8
INFO    | Storing crashdata in: C:\\tmp\\emu-crash.db
Tablet_API_35
`);

  assert.deepEqual(avds, ['Pixel_8', 'Tablet_API_35']);
});

test('selectAvd honors explicit name and otherwise uses first installed AVD', () => {
  assert.equal(selectAvd(['Pixel_8', 'Tablet_API_35'], 'Tablet_API_35'), 'Tablet_API_35');
  assert.equal(selectAvd(['Pixel_8', 'Tablet_API_35'], 'Missing'), null);
  assert.equal(selectAvd(['Pixel_8', 'Tablet_API_35']), 'Pixel_8');
});

test('device helpers distinguish online and tcp transports', () => {
  assert.deepEqual(onlineDevice([{ id: 'emulator-5554', state: 'offline' }, { id: 'abc', state: 'device' }]), {
    id: 'abc',
    state: 'device',
  });
  assert.equal(isTcpTransport('192.168.1.50:5555'), true);
  assert.equal(isTcpTransport('emulator-5554'), false);
});

test('resolveAndroidTool uses SDK fallbacks without hardcoding adb only', () => {
  const sdk = join('C:', 'Android', 'Sdk');
  const adb = join(sdk, 'platform-tools', 'adb.exe');
  const emulator = join(sdk, 'emulator', 'emulator.exe');
  const exists = (candidate) => [sdk, adb, emulator].includes(candidate);
  const env = { ANDROID_HOME: sdk };

  assert.equal(resolveAndroidSdkPath({ env, platform: 'win32', exists }), sdk);
  assert.equal(resolveAndroidTool('adb', { env, platform: 'win32', exists }), adb);
  assert.equal(resolveAndroidTool('emulator', { env, platform: 'win32', exists }), emulator);
});

test('prepareAndroidDevice fails fast when adb server cannot start', () => {
  const runCommand = (_command, args) => {
    if (args.join(' ') === 'start-server') return failed('socketpair failed');
    return ok();
  };

  assert.throws(
    () => prepareAndroidDevice({
      adb: 'adb',
      emulator: 'emulator',
      runCommand,
      log: () => {},
      fail: failWithError,
    }),
    /ADB server failed to start[\s\S]*socketpair failed/,
  );
});

test('prepareAndroidDevice rejects unauthorized devices before emulator launch', () => {
  const runCommand = (_command, args) => {
    if (args.join(' ') === 'devices -l') {
      return ok(`List of devices attached
emulator-5554 unauthorized transport_id:1
`);
    }
    return ok();
  };

  assert.throws(
    () => prepareAndroidDevice({
      adb: 'adb',
      emulator: 'emulator',
      consolePorts: [],
      runCommand,
      log: () => {},
      fail: failWithError,
    }),
    /Device emulator-5554 is unauthorized/,
  );
});

test('prepareAndroidDevice reports missing AVD instead of launching blindly', () => {
  const runCommand = (_command, args) => {
    if (args.join(' ') === 'devices -l') return ok('List of devices attached\n');
    if (args.join(' ') === '-list-avds') return ok('');
    return ok();
  };

  assert.throws(
    () => prepareAndroidDevice({
      adb: 'adb',
      emulator: 'emulator',
      consolePorts: [],
      runCommand,
      spawnProcess: () => {
        throw new Error('should not spawn emulator without an AVD');
      },
      log: () => {},
      fail: failWithError,
    }),
    /No Android emulator AVD is available/,
  );
});

test('prepareAndroidDevice starts configured AVD and waits for boot readiness', () => {
  const calls = [];
  let emulatorSpawned = false;
  const runCommand = (_command, args) => {
    calls.push(args.join(' '));
    if (args.join(' ') === 'devices -l') {
      return emulatorSpawned
        ? ok(`List of devices attached
emulator-5554 device product:sdk model:Pixel_8
`)
        : ok('List of devices attached\n');
    }
    if (args.join(' ') === '-list-avds') return ok('Pixel_8\n');
    if (args.join(' ') === '-s emulator-5554 shell getprop sys.boot_completed') return ok('1\n');
    if (args.join(' ') === '-s emulator-5554 emu avd name') return ok('Pixel_8\nOK\n');
    return ok();
  };
  const spawnCalls = [];

  const ready = prepareAndroidDevice({
    adb: 'adb',
    emulator: 'emulator',
    consolePorts: [],
    env: { ANDROID_AVD_NAME: 'Pixel_8' },
    runCommand,
    spawnProcess: (command, args, options) => {
      emulatorSpawned = true;
      spawnCalls.push({ command, args, options });
      return { unref: () => {} };
    },
    log: () => {},
    fail: failWithError,
  });

  assert.deepEqual(ready, { id: 'emulator-5554', state: 'device' });
  assert.deepEqual(spawnCalls[0].args, ['@Pixel_8']);
  assert.equal(calls.includes('-list-avds'), true);
});

test('prepareAndroidDevice cold boots after closing a stale offline emulator', () => {
  const calls = [];
  const logs = [];
  const spawnCalls = [];
  let clock = 0;
  let staleKilled = false;
  let emulatorSpawned = false;

  const runCommand = (_command, args) => {
    const command = args.join(' ');
    calls.push(command);
    if (command === 'devices -l') {
      if (emulatorSpawned) {
        return ok(`List of devices attached
emulator-5554 device product:sdk model:Pixel_8
`);
      }
      if (staleKilled) return ok('List of devices attached\n');
      return ok(`List of devices attached
emulator-5554 offline transport_id:1
`);
    }
    if (command === '-s emulator-5554 emu kill') {
      staleKilled = true;
      return ok();
    }
    if (command === '-list-avds') return ok('Pixel_8\n');
    if (command === '-s emulator-5554 shell getprop sys.boot_completed') return ok('1\n');
    if (command === '-s emulator-5554 emu avd name') return ok('Pixel_8\nOK\n');
    return ok();
  };

  const ready = prepareAndroidDevice({
    adb: 'adb',
    emulator: 'emulator',
    waitMs: 2,
    emulatorWaitMs: 2,
    consolePorts: [],
    runCommand,
    spawnProcess: (command, args, options) => {
      emulatorSpawned = true;
      spawnCalls.push({ command, args, options });
      return { unref: () => {} };
    },
    now: () => clock,
    sleep: (ms) => {
      clock += ms;
    },
    log: (message) => logs.push(message),
    fail: failWithError,
  });

  assert.deepEqual(ready, { id: 'emulator-5554', state: 'device' });
  assert.equal(calls.includes('-s emulator-5554 emu kill'), true);
  assert.deepEqual(spawnCalls[0].args, ['@Pixel_8', '-no-snapshot-load']);
  assert.equal(logs.some((message) => message.includes('without reusing the previous Quick Boot snapshot')), true);
});

test('prepareAndroidDevice times out when booting emulator never finishes', () => {
  let clock = 0;
  const runCommand = (_command, args) => {
    if (args.join(' ') === 'devices -l') {
      return ok(`List of devices attached
emulator-5554 device product:sdk model:Pixel_8
`);
    }
    if (args.join(' ') === '-s emulator-5554 shell getprop sys.boot_completed') return ok('0\n');
    if (args.join(' ') === '-s emulator-5554 emu avd name') return ok('Pixel_8\nOK\n');
    return ok();
  };

  assert.throws(
    () => prepareAndroidDevice({
      adb: 'adb',
      emulator: 'emulator',
      waitMs: 2,
      emulatorWaitMs: 2,
      consolePorts: [],
      runCommand,
      now: () => clock,
      sleep: (ms) => {
        clock += ms;
      },
      log: () => {},
      fail: failWithError,
    }),
    /Timed out waiting for emulator-5554/,
  );
});

test('startExpoGoAndroid forwards Expo Go Android args without dependency validation', () => {
  const spawnCalls = [];
  const child = {
    on() {
      return child;
    },
  };

  const result = startExpoGoAndroid({
    projectRoot: process.cwd(),
    expoArgs: ['--tunnel'],
    env: {},
    log: () => {},
    fail: failWithError,
    spawnProcess: (command, args, options) => {
      spawnCalls.push({ command, args, options });
      return child;
    },
  });

  assert.equal(result, child);
  assert.deepEqual(spawnCalls[0].args.slice(-4), ['start', '--go', '--android', '--tunnel']);
  assert.equal(spawnCalls[0].options.env.EXPO_NO_DEPENDENCY_VALIDATION, '1');
});
