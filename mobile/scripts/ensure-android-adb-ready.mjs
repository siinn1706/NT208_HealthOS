#!/usr/bin/env node
import { dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { prepareAndroidDevice } from './android-adb-emulator-preflight.mjs';
import { output, resolveAndroidTool } from './android-adb-launch-helpers.mjs';
import { assertPhysicalDeviceReachableEnv } from './android-physical-device-env-guard.mjs';
import { startExpoGoAndroid } from './android-expo-go-launcher.mjs';

const SCRIPT_ARGS = process.argv.slice(2);
const START_EXPO_GO = SCRIPT_ARGS.includes('--start-expo-go');
const EXPO_ARGS = SCRIPT_ARGS.filter((arg) => arg !== '--start-expo-go' && arg !== '--');
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(SCRIPT_DIR);

function log(message) {
  process.stdout.write(`[android-adb] ${message}\n`);
}

function fail(message, result) {
  process.stderr.write(`[android-adb] ${message}\n`);
  if (result) process.stderr.write(`${output(result)}\n`);
  process.exit(1);
}

export function main() {
  const device = prepareAndroidDevice({
    adb: resolveAndroidTool('adb'),
    emulator: resolveAndroidTool('emulator'),
    waitMs: Number(process.env.ANDROID_ADB_WAIT_MS || 15000),
    emulatorWaitMs: Number(process.env.ANDROID_EMULATOR_BOOT_WAIT_MS || 180000),
    env: process.env,
    log,
    fail,
  });
  try {
    assertPhysicalDeviceReachableEnv({
      device,
      projectRoot: PROJECT_ROOT,
      env: process.env,
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  if (START_EXPO_GO) {
    startExpoGoAndroid({ projectRoot: PROJECT_ROOT, expoArgs: EXPO_ARGS, log, fail });
    return;
  }

  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
