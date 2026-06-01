import { existsSync } from 'fs';
import { dirname, join } from 'path';

export function output(result) {
  return `${result.stdout || ''}${result.stderr || ''}`.trim();
}

export function parseDevices(stdout) {
  return stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, state] = line.split(/\s+/);
      return { id, state };
    });
}

export function parseAvdList(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((name) => !name.includes(' '));
}

export function selectAvd(avds, requestedName) {
  if (requestedName) {
    return avds.find((name) => name === requestedName) || null;
  }
  return avds[0] || null;
}

export function onlineDevice(current) {
  return current.find((device) => device.state === 'device');
}

export function isTcpTransport(id) {
  return /^\d+\.\d+\.\d+\.\d+:\d+$/.test(id);
}

export function sdkCandidates({ env = process.env, platform = process.platform } = {}) {
  const candidates = [env.ANDROID_HOME, env.ANDROID_SDK_ROOT];
  if (env.ADB_PATH && /[\\/]/.test(env.ADB_PATH)) {
    candidates.push(dirname(dirname(env.ADB_PATH)));
  }
  if (platform === 'win32' && env.LOCALAPPDATA) {
    candidates.push(join(env.LOCALAPPDATA, 'Android', 'Sdk'));
  }
  return [...new Set(candidates.filter(Boolean))];
}

export function resolveAndroidSdkPath(options = {}) {
  const { exists = existsSync } = options;
  return sdkCandidates(options).find((candidate) => exists(candidate)) || null;
}

export function resolveAndroidTool(tool, { env = process.env, platform = process.platform, exists = existsSync } = {}) {
  if (tool === 'adb' && env.ADB_PATH) return env.ADB_PATH;
  if (tool === 'emulator' && env.ANDROID_EMULATOR_PATH) return env.ANDROID_EMULATOR_PATH;

  const sdk = resolveAndroidSdkPath({ env, platform, exists });
  const exe = platform === 'win32' ? `${tool}.exe` : tool;
  const subdir = tool === 'adb' ? 'platform-tools' : 'emulator';
  const candidate = sdk ? join(sdk, subdir, exe) : null;
  return candidate && exists(candidate) ? candidate : exe;
}
