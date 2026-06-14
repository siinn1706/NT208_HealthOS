import { spawn, spawnSync } from 'child_process';

import {
  isTcpTransport,
  output,
  parseAvdList,
  parseDevices,
  selectAvd,
} from './android-adb-launch-helpers.mjs';

function run(command, args, timeout = 10000) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout,
  });
}

function sleepBlocking(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function prepareAndroidDevice({
  adb,
  emulator,
  waitMs = 15000,
  emulatorWaitMs = 180000,
  consolePorts = [5554, 5556, 5558, 5560, 5562, 5564],
  env = process.env,
  runCommand = run,
  spawnProcess = spawn,
  now = () => Date.now(),
  sleep = sleepBlocking,
  log,
  fail,
}) {
  const runAdb = (args, timeout) => runCommand(adb, args, timeout);
  const runEmulator = (args, timeout = 10000) => runCommand(emulator, args, timeout);

  function devices() {
    const result = runAdb(['devices', '-l']);
    if (result.status !== 0) fail('Unable to list Android devices.', result);
    return parseDevices(result.stdout || '');
  }

  function waitForDevices(predicate, timeout = waitMs) {
    const deadline = now() + timeout;
    let current = devices();
    while (!predicate(current) && now() < deadline) {
      sleep(1000);
      current = devices();
    }
    return current;
  }

  function emulatorConsoleReady(id) {
    const result = runAdb(['-s', id, 'emu', 'avd', 'name'], 3000);
    return result.status === 0 && /\bOK\b/.test(result.stdout || '');
  }

  function bootCompleted(id) {
    const result = runAdb(['-s', id, 'shell', 'getprop', 'sys.boot_completed'], 5000);
    return result.status === 0 && output(result) === '1';
  }

  function readyOnlineDevice(current) {
    const physical = current.find((device) => device.state === 'device' && !device.id.startsWith('emulator-'));
    if (physical) return physical;
    return current.find((device) => device.state === 'device' &&
      device.id.startsWith('emulator-') &&
      bootCompleted(device.id) &&
      emulatorConsoleReady(device.id));
  }

  function consoleEmulators() {
    return consolePorts.map((port) => `emulator-${port}`).filter(emulatorConsoleReady);
  }

  function startServer() {
    const result = runAdb(['start-server']);
    if (result.status !== 0) {
      fail('ADB server failed to start. If the output mentions socketpair or WinError 10106, reset the Windows network stack and reboot.', result);
    }
  }

  function disconnectTcpOffline(current) {
    for (const device of current) {
      if (device.state === 'offline' && isTcpTransport(device.id)) {
        log(`disconnecting stale TCP transport ${device.id}`);
        runAdb(['disconnect', device.id], 5000);
      }
    }
  }

  function reconnectOffline() {
    const current = devices();
    if (!current.some((device) => device.state === 'offline')) return current;
    log('reconnecting offline ADB transports');
    runAdb(['reconnect', 'offline'], 10000);
    return waitForDevices((next) => readyOnlineDevice(next) || !next.some((device) => device.state === 'offline'), 5000);
  }

  function killStaleEmulators(ids) {
    for (const id of ids) {
      log(`closing stale emulator transport ${id}`);
      runAdb(['-s', id, 'emu', 'kill'], 5000);
    }
    waitForDevices((next) => !next.some((device) => ids.includes(device.id)), 10000);
  }

  function listAvds() {
    const result = runEmulator(['-list-avds']);
    return result.status === 0 ? parseAvdList(result.stdout || '') : [];
  }

  function waitForBootedEmulator() {
    const deadline = now() + emulatorWaitMs;
    while (now() < deadline) {
      const ready = devices().find((device) => device.id.startsWith('emulator-') &&
        device.state === 'device' &&
        bootCompleted(device.id) &&
        emulatorConsoleReady(device.id));
      if (ready) return ready;
      sleep(1000);
    }
    return null;
  }

  function startConfiguredEmulator({ noSnapshotLoad = false } = {}) {
    const avds = listAvds();
    const avd = selectAvd(avds, env.ANDROID_AVD_NAME);
    if (!avd) {
      const suffix = env.ANDROID_AVD_NAME ? ` Requested ANDROID_AVD_NAME=${env.ANDROID_AVD_NAME} was not found.` : '';
      fail(`No Android emulator AVD is available.${suffix} Create one in Android Studio or connect a physical device.`);
    }

    const emulatorArgs = [`@${avd}`];
    if (noSnapshotLoad) emulatorArgs.push('-no-snapshot-load');
    const mode = noSnapshotLoad ? ' with a cold boot' : '';
    log(`opening emulator ${avd}${mode}; waiting for ADB and console readiness before Expo starts`);
    const child = spawnProcess(emulator, emulatorArgs, {
      detached: true,
      shell: process.platform === 'win32',
      stdio: 'ignore',
    });
    child.unref?.();

    const ready = waitForBootedEmulator();
    if (!ready) {
      const manualArgs = [`@${avd}`, noSnapshotLoad ? '-no-snapshot-load' : ''].filter(Boolean).join(' ');
      fail(`Timed out waiting for emulator ${avd}. Start it manually with "${emulator} ${manualArgs}", then rerun npm run android.`);
    }
    log(`using ${ready.id}`);
    return ready;
  }

  startServer();

  let current = devices();
  let shouldColdBootEmulator = false;
  const initialOnline = readyOnlineDevice(current);
  if (initialOnline) {
    log(`using ${initialOnline.id}`);
    return initialOnline;
  }

  disconnectTcpOffline(current);
  current = reconnectOffline();

  const reconnectedOnline = readyOnlineDevice(current);
  if (reconnectedOnline) {
    log(`using ${reconnectedOnline.id}`);
    return reconnectedOnline;
  }

  const bootingEmulator = current.find((device) => device.state === 'device' && device.id.startsWith('emulator-'));
  if (bootingEmulator) {
    log(`waiting for ${bootingEmulator.id} to finish booting`);
    const ready = waitForBootedEmulator();
    if (ready) {
      log(`using ${ready.id}`);
      return ready;
    }
    fail(`Timed out waiting for ${bootingEmulator.id}. Restart the emulator or run adb -s ${bootingEmulator.id} emu kill, then retry npm run android.`);
  }

  const staleIds = [
    ...new Set([
      ...current.filter((device) => device.state === 'offline' && device.id.startsWith('emulator-')).map((device) => device.id),
      ...consoleEmulators().filter((id) => !current.some((device) => device.id === id && device.state === 'device')),
    ]),
  ];

  if (staleIds.length > 0) {
    killStaleEmulators(staleIds);
    runAdb(['kill-server'], 5000);
    startServer();
    shouldColdBootEmulator = true;
    log('stale emulator closed; starting a fresh Android emulator without reusing the previous Quick Boot snapshot');
  }

  current = devices();
  const unauthorized = current.find((device) => device.state === 'unauthorized');
  if (unauthorized) {
    fail(`Device ${unauthorized.id} is unauthorized. Unlock the emulator and accept the USB debugging prompt, then run npm run android again.`);
  }

  return startConfiguredEmulator({ noSnapshotLoad: shouldColdBootEmulator });
}
