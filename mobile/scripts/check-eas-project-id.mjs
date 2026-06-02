#!/usr/bin/env node
// Validates EAS_PROJECT_ID is a UUID and is wired through app.config.js.

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const IS_CI = Boolean(process.env.CI);

function fail(message) {
  if (IS_CI) {
    console.error(`[check-eas-project-id] ERROR: ${message}`);
    process.exit(1);
  } else {
    console.warn(`[check-eas-project-id] WARNING (local): ${message}`);
  }
}

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const projectId = (process.env.EAS_PROJECT_ID ?? '').trim();

if (!projectId) {
  fail('EAS_PROJECT_ID is not set.');
  process.exit(IS_CI ? 1 : 0);
}

if (!UUID_V4_RE.test(projectId)) {
  fail(`EAS_PROJECT_ID="${projectId}" is not a valid UUID v4.`);
  process.exit(IS_CI ? 1 : 0);
}

// Verify app.config.js exposes the same value under extra.eas.projectId
try {
  const configPath = path.resolve(__dirname, '..', 'app.config.js');
  const configFn = require(configPath);
  const resolved = configFn({ config: {} });
  const configuredId = resolved?.extra?.eas?.projectId;

  if (!configuredId) {
    fail('app.config.js did not produce extra.eas.projectId — ensure withEasProjectId() reads EAS_PROJECT_ID.');
    process.exit(IS_CI ? 1 : 0);
  }

  if (configuredId !== projectId) {
    fail(
      `EAS_PROJECT_ID env var (${projectId}) does not match extra.eas.projectId in app.config.js (${configuredId}).`,
    );
    process.exit(IS_CI ? 1 : 0);
  }

  console.log(`[check-eas-project-id] EAS_PROJECT_ID valid and matched in app.config.js: ${projectId}`);
} catch (err) {
  fail(`Could not load app.config.js for verification: ${err.message}`);
  process.exit(IS_CI ? 1 : 0);
}
