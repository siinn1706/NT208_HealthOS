import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  assertPublicKeyIsSafe,
  parseDotenv,
  renderTargets,
  resolveTargetNames,
  stringifyEnvValue,
  validateEnv,
  writeRenderedFile,
} from "./render-env.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MASTER_EXAMPLE = path.join(SCRIPT_DIR, "../env/.env.master.example");

function loadExampleEnv(overrides = {}) {
  return {
    ...parseDotenv(fs.readFileSync(MASTER_EXAMPLE, "utf8")),
    ...overrides,
  };
}

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "healthos-render-env-"));
}

test("parseDotenv handles comments, inline comments, and quoted values", () => {
  const parsed = parseDotenv(`
    # comment
    FOO=bar
    WITH_COMMENT=value # trailing comment
    QUOTED="hello world"
    SINGLE='literal value'
  `);

  assert.deepEqual(parsed, {
    FOO: "bar",
    WITH_COMMENT: "value",
    QUOTED: "hello world",
    SINGLE: "literal value",
  });
});

test("stringifyEnvValue preserves JSON-looking arrays for pydantic env parsing", () => {
  assert.equal(stringifyEnvValue('["https://healthos.test"]'), '["https://healthos.test"]');
  assert.equal(stringifyEnvValue("hello world"), '"hello world"');
});

test("renderTargets overwrites generated env files deterministically", () => {
  const root = makeTempRoot();
  const env = loadExampleEnv({ BFF_SHARED_SECRET: "local-shared-secret" });
  const [backend] = renderTargets(env, ["backend"], root);

  fs.mkdirSync(path.dirname(backend.absolutePath), { recursive: true });
  fs.writeFileSync(backend.absolutePath, "OLD_VALUE=1\n", "utf8");
  writeRenderedFile(backend);

  const content = fs.readFileSync(backend.absolutePath, "utf8");
  assert.match(content, /BFF_SHARED_SECRET=local-shared-secret/);
  assert.doesNotMatch(content, /OLD_VALUE=1/);
});

test("target aliases expand to the expected render set", () => {
  assert.deepEqual(resolveTargetNames("workers"), ["ai-worker", "queue-worker", "notification"]);
  assert.ok(resolveTargetNames("all").includes("compose-prod"));
});

test("validateEnv reports missing master keys", () => {
  const env = loadExampleEnv();
  delete env.BFF_SHARED_SECRET;

  assert.throws(
    () => validateEnv(env, ["backend"]),
    /missing required key\(s\): BFF_SHARED_SECRET/,
  );
});

test("validateEnv rejects production placeholder values", () => {
  const env = loadExampleEnv({ APP_ENV: "production", NODE_ENV: "production" });

  assert.throws(
    () => validateEnv(env, resolveTargetNames("prod"), { requireProdValidation: true }),
    /placeholder\/development value/,
  );
});

test("validateEnv accepts production-shaped master values", () => {
  const env = loadExampleEnv({
    APP_ENV: "production",
    NODE_ENV: "production",
    DEBUG: "false",
    LOG_FORMAT: "json",
    SECRET_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    BFF_SHARED_SECRET: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    DATABASE_URL: "postgresql+asyncpg://healthos:prod-pass@db.internal:5432/healthos",
    REDIS_URL: "redis://:prod-pass@redis.internal:6379/0",
    ALLOWED_ORIGINS: '["https://healthos.test"]',
    STORAGE_ACCESS_KEY: "prod-storage-access",
    STORAGE_SECRET_KEY: "prod-storage-secret",
    GOOGLE_CLIENT_SECRET: "google-prod-secret",
    GITHUB_CLIENT_SECRET: "github-prod-secret",
    FERNET_KEY: "4cOBF-A3G-3YXr5lLT5JaUEM7iPU2NUB9FjoWUd--ng=",
    METRICS_TOKEN: "metrics-token-0123456789",
    NEXTAUTH_URL: "https://healthos.test",
    NEXTAUTH_SECRET: "nextauth-secret-0123456789abcdef012345",
    POSTGRES_PASSWORD: "prod-postgres-pass",
    REDIS_PASSWORD: "prod-redis-pass",
    MINIO_ROOT_USER: "prod-minio-root",
    MINIO_ROOT_PASSWORD: "prod-minio-pass",
    NEXT_PUBLIC_APP_URL: "https://healthos.test",
    NEXT_PUBLIC_CORE_WS_URL: "wss://healthos.test/ws",
    EXPO_PUBLIC_CORE_API_URL: "https://api.healthos.test",
    EXPO_PUBLIC_CORE_WS_URL: "wss://api.healthos.test/ws",
  });

  assert.doesNotThrow(() => validateEnv(env, resolveTargetNames("prod"), { requireProdValidation: true }));
});

test("public env keys must not look like server-side secrets", () => {
  assert.throws(
    () => assertPublicKeyIsSafe("NEXT_PUBLIC_API_KEY"),
    /looks secret-like/,
  );
});

test("rendered files contain only target-relevant service keys", () => {
  const root = makeTempRoot();
  const env = loadExampleEnv({ AI_PROXY_API_KEY: "proxy-secret", FIREBASE_PROJECT_ID: "firebase-project" });
  const rendered = renderTargets(env, ["mobile", "notification", "ai-worker"], root);
  for (const file of rendered) writeRenderedFile(file);

  const mobile = fs.readFileSync(path.join(root, "mobile/.env"), "utf8");
  const notification = fs.readFileSync(path.join(root, "services/notification/.env"), "utf8");
  const aiWorker = fs.readFileSync(path.join(root, "services/ai-worker/.env"), "utf8");

  assert.match(mobile, /EXPO_PUBLIC_CORE_API_URL=/);
  assert.doesNotMatch(mobile, /AI_PROXY_BASE_URL=/);
  assert.match(notification, /FIREBASE_PROJECT_ID=firebase-project/);
  assert.doesNotMatch(notification, /AI_PROXY_BASE_URL=/);
  assert.match(aiWorker, /AI_PROXY_BASE_URL=http:\/\/localhost:20128\/v1/);
  assert.match(aiWorker, /AI_PROXY_MODEL=oc\/deepseek-v4-flash-free/);
  assert.match(aiWorker, /AI_PROXY_API_KEY=proxy-secret/);
  assert.doesNotMatch(aiWorker, /GEMINI_API_KEY=/);
});
