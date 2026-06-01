#!/usr/bin/env node
import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { prepareAndroidDevice } from './android-adb-emulator-preflight.mjs';
import { output, resolveAndroidTool } from './android-adb-launch-helpers.mjs';
import { assertPhysicalDeviceReachableEnv } from './android-physical-device-env-guard.mjs';
import { assertAndroidNativeReadiness } from './android-native-readiness.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(SCRIPT_DIR);

function log(message) {
  process.stdout.write(`[android-native] ${message}\n`);
}

function fail(message, result) {
  process.stderr.write(`[android-native] ${message}\n`);
  if (result) process.stderr.write(`${output(result)}\n`);
  process.exit(1);
}

export function parseExpoRunAndroidArgs(args) {
  const expoArgs = [];
  let adbSerial = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') continue;

    if (arg === '-d' || arg === '--device') {
      expoArgs.push(arg);
      if (args[index + 1]) {
        expoArgs.push(args[index + 1]);
        index += 1;
      }
      continue;
    }

    const looksLikeAdbDeviceId = /^emulator-\d+$/.test(arg) || /^[\w.-]+:\d+$/.test(arg);
    if (looksLikeAdbDeviceId) {
      adbSerial = arg;
      continue;
    }

    expoArgs.push(arg);
  }

  return { expoArgs, adbSerial };
}

export function normalizeExpoRunAndroidArgs(args) {
  return parseExpoRunAndroidArgs(args).expoArgs;
}

function spawnExpoRunAndroid({ env, args, deviceId }) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const { expoArgs, adbSerial } = parseExpoRunAndroidArgs(args);
  const childEnv = {
    ...env,
    ANDROID_SERIAL: adbSerial || deviceId || env.ANDROID_SERIAL,
  };
  log(`running expo run:android ${expoArgs.join(' ')}`.trimEnd());
  const child = spawn(command, ['expo', 'run:android', ...expoArgs], {
    cwd: PROJECT_ROOT,
    env: childEnv,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.stderr.write(`[android-native] expo run:android exited with signal ${signal}\n`);
      process.exit(1);
    }
    process.exit(code ?? 1);
  });
}

export function main() {
  const readiness = assertAndroidNativeReadiness({ projectRoot: PROJECT_ROOT, env: process.env, log, fail });
  const device = prepareAndroidDevice({
    adb: resolveAndroidTool('adb', { env: readiness.env }),
    emulator: resolveAndroidTool('emulator', { env: readiness.env }),
    waitMs: Number(process.env.ANDROID_ADB_WAIT_MS || 15000),
    emulatorWaitMs: Number(process.env.ANDROID_EMULATOR_BOOT_WAIT_MS || 180000),
    env: readiness.env,
    log,
    fail,
  });
  try {
    assertPhysicalDeviceReachableEnv({ device, projectRoot: PROJECT_ROOT, env: readiness.env });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  spawnExpoRunAndroid({ env: readiness.env, args: process.argv.slice(2), deviceId: device.id });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
