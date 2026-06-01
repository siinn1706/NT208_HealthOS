import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export function resolveExpoCommand(projectRoot) {
  const localExpoCli = join(projectRoot, 'node_modules', 'expo', 'bin', 'cli');
  if (existsSync(localExpoCli)) {
    return { command: process.execPath, argsPrefix: [localExpoCli], shell: false };
  }

  const localExpo = join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'expo.cmd' : 'expo');
  return {
    command: existsSync(localExpo) ? localExpo : process.platform === 'win32' ? 'expo.cmd' : 'expo',
    argsPrefix: [],
    shell: process.platform === 'win32',
  };
}

export function startExpoGoAndroid({ projectRoot, expoArgs, log, fail, env = process.env, spawnProcess = spawn }) {
  const expo = resolveExpoCommand(projectRoot);
  const childEnv = {
    ...env,
    EXPO_NO_DEPENDENCY_VALIDATION: env.EXPO_NO_DEPENDENCY_VALIDATION || '1',
  };

  log('starting Expo Android; dependency validation is disabled for offline-safe startup');
  const child = spawnProcess(expo.command, [...expo.argsPrefix, 'start', '--go', '--android', ...expoArgs], {
    cwd: projectRoot,
    env: childEnv,
    shell: expo.shell,
    stdio: 'inherit',
  });

  child.on('error', (error) => fail(`Unable to start Expo CLI: ${error.message}`));
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  return child;
}
