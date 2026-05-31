import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

test("local queue worker starts the backend Celery app that owns meal analysis", () => {
  const script = read("infra/scripts/start_queue_worker.ps1");

  assert.match(script, /-ServiceDir \(Join-Path \$Root "backend"\)/);
  assert.match(script, /-StartCommand "celery -A app\.tasks:celery_app worker --loglevel=info --pool=solo"/);
  assert.doesNotMatch(script, /services\\queue-worker/);
});

test("docker queue workers use the backend Celery app entrypoint", () => {
  const devCompose = read("infra/docker/docker-compose.dev.yml");
  const prodCompose = read("infra/docker/docker-compose.prod.yml");

  assert.match(devCompose, /command: celery -A app\.tasks:celery_app worker --loglevel=info --pool=solo/);
  assert.match(prodCompose, /command: celery -A app\.tasks:celery_app worker --loglevel=info/);
  assert.doesNotMatch(devCompose, /app\.tasks\.celery_app/);
  assert.doesNotMatch(prodCompose, /app\.tasks\.celery_app/);
});
