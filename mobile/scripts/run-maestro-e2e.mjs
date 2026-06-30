#!/usr/bin/env node
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(__dirname, '..');
const DEFAULT_APP_ID = 'com.nt208.healthos';
const DEFAULT_FLOWS = [
  'auth-login.yaml',
  'locale-switch-vi.yaml',
  'locale-switch-en.yaml',
  'locale-persistence.yaml',
];

function parseArgs(argv) {
  const options = {
    flows: process.env.MAESTRO_FLOW
      ? process.env.MAESTRO_FLOW.split(',').map((item) => item.trim()).filter(Boolean)
      : DEFAULT_FLOWS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--flow') {
      options.flows = [argv[i + 1]];
      i += 1;
    } else if (arg === '--help') {
      options.help = true;
    } else if (!arg.startsWith('-')) {
      options.flows = [arg];
    }
  }

  return options;
}

function printHelp() {
  console.log([
    'Usage: npm run e2e:android:locale -- [auth-login.yaml]',
    '',
    'Environment:',
    '  MAESTRO_APP_ID            Android package, defaults to com.nt208.healthos',
    '  MAESTRO_TEST_EMAIL        Test account email for auth-login.yaml',
    '  MAESTRO_TEST_PASSWORD     Test account password for auth-login.yaml',
    '  MAESTRO_FLOW              Optional comma-separated flow list',
  ].join('\n'));
}

function ensureMaestro() {
  const result = spawnSync('maestro', ['--version'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error('Maestro CLI is not available on PATH. Install Maestro before running locale E2E.');
  }
}

function validateEnvironment(flows) {
  if (!flows.includes('auth-login.yaml')) return;
  const missing = ['MAESTRO_TEST_EMAIL', 'MAESTRO_TEST_PASSWORD'].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required auth-login environment variable(s): ${missing.join(', ')}`);
  }
}

function runFlow(flowName) {
  const flowPath = join(mobileRoot, 'e2e', 'maestro', flowName);
  if (!existsSync(flowPath)) {
    throw new Error(`Maestro flow not found: ${flowPath}`);
  }

  console.log(`Running Maestro flow: ${flowName}`);
  const result = spawnSync('maestro', ['test', flowPath], {
    cwd: mobileRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      MAESTRO_APP_ID: process.env.MAESTRO_APP_ID || DEFAULT_APP_ID,
      MAESTRO_CLI_NO_ANALYTICS: process.env.MAESTRO_CLI_NO_ANALYTICS || 'true',
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: process.env.MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED || 'true',
    },
  });

  if (result.status !== 0) {
    throw new Error(`Maestro flow failed: ${flowName}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  ensureMaestro();
  validateEnvironment(options.flows);
  for (const flow of options.flows) {
    runFlow(flow);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
