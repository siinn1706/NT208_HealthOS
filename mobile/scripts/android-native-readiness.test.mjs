import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import test from 'node:test';

import {
  assertAndroidNativeReadiness,
  createNativeRunEnv,
  parseJavaMajorVersion,
  resolveNativeJdk,
} from './android-native-readiness.mjs';

const ok = (stdout = '', stderr = '') => ({ status: 0, stdout, stderr });
const failed = (stderr = '') => ({ status: 1, stdout: '', stderr });

function withTempProject(callback) {
  const root = mkdtempSync(join(tmpdir(), 'healthos-native-ready-'));
  try {
    return callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeProjectFiles(root, easOverride = {}) {
  writeFileSync(join(root, 'app.json'), JSON.stringify({
    expo: {
      icon: './assets/icons/icon.png',
      splash: { image: './assets/icons/splash.png' },
      android: {
        package: 'com.nt208.healthos',
        versionCode: 1,
        adaptiveIcon: { foregroundImage: './assets/icons/adaptive-icon.png' },
      },
    },
  }));
  writeFileSync(join(root, 'eas.json'), JSON.stringify({
    build: {
      preview: { android: { buildType: 'apk' } },
      production: { android: { buildType: 'app-bundle', autoIncrement: 'versionCode' } },
    },
    submit: { production: { android: { track: 'internal' } } },
    ...easOverride,
  }));
}

test('parseJavaMajorVersion handles modern and legacy javac output', () => {
  assert.equal(parseJavaMajorVersion('javac 21.0.10'), 21);
  assert.equal(parseJavaMajorVersion('javac 17.0.12'), 17);
  assert.equal(parseJavaMajorVersion('java version "1.8.0_481"'), 8);
  assert.equal(parseJavaMajorVersion('not java'), null);
});

test('resolveNativeJdk prefers JAVA_HOME when it has javac 17+', () => withTempProject((root) => {
  const javaHome = join(root, 'jdk');
  const javac = join(javaHome, 'bin', 'javac.exe');
  mkdirSync(dirname(javac), { recursive: true });
  writeFileSync(javac, '');

  const resolved = resolveNativeJdk({
    env: { JAVA_HOME: javaHome },
    platform: 'win32',
    exists: (path) => path === javac,
    runCommand: () => ok('javac 21.0.10'),
  });

  assert.equal(resolved.source, 'JAVA_HOME');
  assert.equal(resolved.javaHome, javaHome);
  assert.equal(resolved.versionMajor, 21);
}));

test('resolveNativeJdk rejects an environment without javac', () => {
  const resolved = resolveNativeJdk({
    env: {},
    platform: 'win32',
    exists: () => false,
    runCommand: () => failed('not found'),
  });

  assert.equal(resolved, null);
});

test('createNativeRunEnv injects resolved JDK into child process env', () => {
  const env = createNativeRunEnv({
    env: { PATH: 'old-path' },
    jdk: { javaHome: 'C:\\Android\\jbr', binDir: 'C:\\Android\\jbr\\bin' },
    sdk: 'C:\\Android\\Sdk',
  });

  assert.equal(env.JAVA_HOME, 'C:\\Android\\jbr');
  assert.equal(env.ANDROID_HOME, 'C:\\Android\\Sdk');
  assert.equal(env.ANDROID_SDK_ROOT, 'C:\\Android\\Sdk');
  assert.match(env.PATH, /^C:\\Android\\jbr\\bin/);
});

test('assertAndroidNativeReadiness validates JDK, SDK tools, Expo config, and EAS profiles', () => withTempProject((root) => {
  writeProjectFiles(root);
  const localAppData = join(root, 'local');
  const sdk = join(localAppData, 'Android', 'Sdk');
  const adb = join(sdk, 'platform-tools', 'adb.exe');
  const emulator = join(sdk, 'emulator', 'emulator.exe');
  const javaHome = join(root, 'jdk');
  const javac = join(javaHome, 'bin', 'javac.exe');
  for (const file of [adb, emulator, javac]) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, '');
  }

  const result = assertAndroidNativeReadiness({
    projectRoot: root,
    env: { JAVA_HOME: javaHome, LOCALAPPDATA: localAppData, PATH: '' },
    platform: 'win32',
    exists: (path) => [sdk, adb, emulator, javac].includes(path),
    runCommand: (command, args) => {
      if (String(command).endsWith('javac.exe')) return ok('javac 21.0.10');
      if (args.join(' ') === 'version') return ok('Android Debug Bridge version 1.0.41');
      if (args.join(' ') === '-version') return ok('Android emulator version 35.0.0');
      return ok();
    },
    log: () => {},
  });

  assert.equal(result.jdk.javaHome, javaHome);
  assert.equal(result.sdk, sdk);
  assert.equal(result.adb, adb);
}));

test('assertAndroidNativeReadiness fails when production AAB profile is missing', () => withTempProject((root) => {
  writeProjectFiles(root, { build: { preview: { android: { buildType: 'apk' } }, production: { android: { buildType: 'apk' } } } });

  assert.throws(
    () => assertAndroidNativeReadiness({
      projectRoot: root,
      env: { JAVA_HOME: 'jdk', LOCALAPPDATA: 'sdk-root' },
      platform: 'win32',
      exists: () => true,
      runCommand: () => ok('javac 21.0.10'),
      log: () => {},
    }),
    /production\.android\.buildType must be app-bundle/,
  );
}));
