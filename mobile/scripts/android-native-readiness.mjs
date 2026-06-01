#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { delimiter, dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { resolveAndroidSdkPath, resolveAndroidTool } from './android-adb-launch-helpers.mjs';

export const MIN_JDK_MAJOR = 17;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(SCRIPT_DIR);
const WINDOWS_ANDROID_STUDIO_JBR = 'C:\\Program Files\\Android\\Android Studio\\jbr';

function commandName(name, platform = process.platform) {
  return platform === 'win32' ? `${name}.exe` : name;
}

function defaultRunCommand(command, args = [], timeout = 10000, env = process.env) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    env,
    timeout,
  });
}

function output(result) {
  return `${result?.stdout || ''}${result?.stderr || ''}`.trim();
}

export function parseJavaMajorVersion(text) {
  const match = String(text || '').match(/(?:javac|version)\s+"?(\d+)(?:\.(\d+))?/i);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  return first === 1 && Number.isFinite(second) ? second : first;
}

export function jdkHomeCandidates({ env = process.env, platform = process.platform } = {}) {
  const candidates = [env.JAVA_HOME];
  if (platform === 'win32') candidates.push(WINDOWS_ANDROID_STUDIO_JBR);
  return [...new Set(candidates.filter(Boolean))];
}

function resolveJdkFromHome(home, { platform, exists, runCommand, env }) {
  const javac = join(home, 'bin', commandName('javac', platform));
  if (!exists(javac)) return null;
  const versionResult = runCommand(javac, ['-version'], 10000, env);
  if (versionResult.status !== 0) {
    return { error: `${javac} exists but did not run: ${output(versionResult)}` };
  }
  return {
    javaHome: home,
    binDir: join(home, 'bin'),
    javac,
    source: home === env.JAVA_HOME ? 'JAVA_HOME' : 'Android Studio JBR',
    versionMajor: parseJavaMajorVersion(output(versionResult)),
    versionText: output(versionResult),
  };
}

export function resolveNativeJdk({
  env = process.env,
  platform = process.platform,
  exists = existsSync,
  runCommand = defaultRunCommand,
} = {}) {
  const diagnostics = [];
  for (const home of jdkHomeCandidates({ env, platform })) {
    const candidate = resolveJdkFromHome(home, { platform, exists, runCommand, env });
    if (!candidate) continue;
    if (candidate.error) {
      diagnostics.push(candidate.error);
      continue;
    }
    if (candidate.versionMajor >= MIN_JDK_MAJOR) return { ...candidate, diagnostics };
    diagnostics.push(`${candidate.source} has ${candidate.versionText}; JDK ${MIN_JDK_MAJOR}+ is required.`);
  }

  const pathJavac = commandName('javac', platform);
  const pathResult = runCommand(pathJavac, ['-version'], 10000, env);
  if (pathResult.status === 0) {
    const versionMajor = parseJavaMajorVersion(output(pathResult));
    if (versionMajor >= MIN_JDK_MAJOR) {
      return {
        javaHome: '',
        binDir: '',
        javac: pathJavac,
        source: 'PATH',
        versionMajor,
        versionText: output(pathResult),
        diagnostics,
      };
    }
    diagnostics.push(`PATH javac has ${output(pathResult)}; JDK ${MIN_JDK_MAJOR}+ is required.`);
  } else {
    diagnostics.push(`PATH javac is unavailable: ${output(pathResult) || 'not found'}.`);
  }
  return null;
}

function readJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function validateEasJson(easJson, errors) {
  if (easJson.build?.preview?.android?.buildType !== 'apk') {
    errors.push('eas.json build.preview.android.buildType must be apk.');
  }
  if (easJson.build?.production?.android?.buildType !== 'app-bundle') {
    errors.push('eas.json build.production.android.buildType must be app-bundle.');
  }
  const autoIncrement = easJson.build?.production?.android?.autoIncrement;
  if (autoIncrement !== 'versionCode' && autoIncrement !== true) {
    errors.push('eas.json production Android build must auto-increment versionCode.');
  }
  if (!easJson.submit?.production?.android?.track) {
    errors.push('eas.json submit.production.android.track is required.');
  }
}

function validateStaticExpoConfig(appJson, errors) {
  const expo = appJson.expo || {};
  if (expo.android?.package !== 'com.nt208.healthos') {
    errors.push('app.json android.package must be com.nt208.healthos.');
  }
  if (!Number.isInteger(expo.android?.versionCode) || expo.android.versionCode < 1) {
    errors.push('app.json android.versionCode must be a positive integer.');
  }
  for (const [label, path] of [
    ['icon', expo.icon],
    ['adaptiveIcon.foregroundImage', expo.android?.adaptiveIcon?.foregroundImage],
    ['splash.image', expo.splash?.image],
  ]) {
    if (!path) errors.push(`app.json ${label} is required for native builds.`);
  }
}

function assertTool(command, args, label, errors, runCommand, env) {
  const result = runCommand(command, args, 10000, env);
  if (result.status !== 0) errors.push(`${label} is unavailable: ${output(result) || command}`);
}

export function createNativeRunEnv({ env = process.env, jdk, sdk }) {
  const nextEnv = { ...env };
  if (jdk?.javaHome) {
    nextEnv.JAVA_HOME = jdk.javaHome;
    nextEnv.PATH = [jdk.binDir, env.PATH || env.Path || ''].filter(Boolean).join(delimiter);
  }
  if (sdk) {
    nextEnv.ANDROID_HOME = env.ANDROID_HOME || sdk;
    nextEnv.ANDROID_SDK_ROOT = env.ANDROID_SDK_ROOT || sdk;
  }
  return nextEnv;
}

export function assertAndroidNativeReadiness({
  projectRoot = PROJECT_ROOT,
  env = process.env,
  platform = process.platform,
  exists = existsSync,
  runCommand = defaultRunCommand,
  log = (message) => process.stdout.write(`${message}\n`),
  fail = (message) => { throw new Error(message); },
} = {}) {
  const errors = [];
  const jdk = resolveNativeJdk({ env, platform, exists, runCommand });
  if (!jdk) {
    errors.push(`JDK ${MIN_JDK_MAJOR}+ with javac is required for expo run:android. Set JAVA_HOME to Android Studio JBR, for example: ${WINDOWS_ANDROID_STUDIO_JBR}`);
  }

  const sdk = resolveAndroidSdkPath({ env, platform, exists });
  const adb = resolveAndroidTool('adb', { env, platform, exists });
  const emulator = resolveAndroidTool('emulator', { env, platform, exists });
  const runEnv = createNativeRunEnv({ env, jdk, sdk });
  assertTool(adb, ['version'], 'ADB', errors, runCommand, runEnv);
  assertTool(emulator, ['-version'], 'Android emulator', errors, runCommand, runEnv);

  try {
    validateStaticExpoConfig(readJsonFile(resolve(projectRoot, 'app.json')), errors);
  } catch (error) {
    errors.push(`Unable to read app.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    validateEasJson(readJsonFile(resolve(projectRoot, 'eas.json')), errors);
  } catch (error) {
    errors.push(`Unable to read eas.json: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (errors.length > 0) fail(`Android native readiness failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);

  log(`[android-native] JDK: ${jdk.source} ${jdk.versionText}${jdk.javaHome ? ` (${jdk.javaHome})` : ''}`);
  log(`[android-native] Android SDK: ${sdk || 'resolved from PATH'}`);
  log(`[android-native] ADB: ${adb}`);
  log('[android-native] EAS Android profiles: preview APK, production AAB.');
  return { jdk, sdk, adb, emulator, env: runEnv };
}

export function main() {
  assertAndroidNativeReadiness({
    fail(message) {
      process.stderr.write(`${message}\n`);
      process.exit(1);
    },
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
