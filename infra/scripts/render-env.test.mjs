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
const ANDROID_SHA256 = Array.from({ length: 32 }, (_, index) => index.toString(16).padStart(2, "0")).join(":").toUpperCase();

function loadExampleEnv(overrides = {}) {
  return {
    ...parseDotenv(fs.readFileSync(MASTER_EXAMPLE, "utf8")),
    ...overrides,
  };
}

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "healthos-render-env-"));
}

function loadProductionEnv(overrides = {}) {
  return loadExampleEnv({
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
    BFF_TRUSTED_ORIGINS: "https://healthos.test",
    EXPO_PUBLIC_API_URL: "https://healthos.test",
    COOKIE_MAX_AGE: "3600",
    POSTGRES_PASSWORD: "prod-postgres-pass",
    REDIS_PASSWORD: "prod-redis-pass",
    MINIO_ROOT_USER: "prod-minio-root",
    MINIO_ROOT_PASSWORD: "prod-minio-pass",
    NEXT_PUBLIC_APP_URL: "https://healthos.test",
    NEXT_PUBLIC_WS_URL: "wss://healthos.test",
    NEXT_PUBLIC_CORE_WS_URL: "wss://healthos.test",
    EXPO_PUBLIC_CORE_API_URL: "https://api.healthos.test",
    EXPO_PUBLIC_WS_URL: "wss://api.healthos.test",
    EXPO_PUBLIC_CORE_WS_URL: "wss://api.healthos.test",
    EXPO_PUBLIC_WEB_APP_URL: "https://healthos.test",
    EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI: "https://healthos.test/auth/oauth/mobile-callback",
    MOBILE_OAUTH_REDIRECT_URIS: "nt208://auth/oauth/callback,https://healthos.test/auth/oauth/mobile-callback",
    ANDROID_APP_LINK_PACKAGE_NAME: "com.nt208.healthos",
    ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS: ANDROID_SHA256,
    ...overrides,
  });
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
  assert.match(content, /DB_DISABLE_POOL=false/);
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

test("backend rendering defaults missing DB_DISABLE_POOL for existing master env files", () => {
  const root = makeTempRoot();
  const env = loadExampleEnv();
  delete env.DB_DISABLE_POOL;

  assert.doesNotThrow(() => validateEnv(env, ["backend"]));

  const [backend] = renderTargets(env, ["backend"], root);
  assert.match(backend.content, /DB_DISABLE_POOL=false/);
});

test("mobile rendering defaults missing public URLs to blank emulator local values", () => {
  const root = makeTempRoot();
  const env = loadExampleEnv();
  delete env.EXPO_PUBLIC_CORE_API_URL;
  delete env.EXPO_PUBLIC_CORE_WS_URL;
  delete env.EXPO_PUBLIC_WEB_APP_URL;
  delete env.EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI;

  assert.doesNotThrow(() => validateEnv(env, ["mobile"]));

  const [mobile] = renderTargets(env, ["mobile"], root);
  assert.match(mobile.content, /^EXPO_PUBLIC_API_URL=$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_CORE_API_URL=$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_CORE_WS_URL=$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_WEB_APP_URL=$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI=$/m);
});

test("validateEnv rejects production placeholder values", () => {
  const env = loadProductionEnv({ SECRET_KEY: "change-me" });

  assert.throws(
    () => validateEnv(env, resolveTargetNames("prod"), { requireProdValidation: true }),
    /SECRET_KEY.*placeholder\/development value/,
  );
});

test("validateEnv accepts production-shaped master values", () => {
  const env = loadProductionEnv();

  assert.doesNotThrow(() => validateEnv(env, resolveTargetNames("prod"), { requireProdValidation: true }));
});

test("validateEnv rejects production frontend without trusted BFF origins", () => {
  const env = loadProductionEnv({
    BFF_TRUSTED_ORIGINS: "",
  });

  assert.throws(
    () => validateEnv(env, ["frontend"], { requireProdValidation: true }),
    /BFF_TRUSTED_ORIGINS/,
  );
});

test("validateEnv rejects production dev bypass configuration", () => {
  const env = loadProductionEnv({
    DEV_BYPASS_ENABLED: "true",
    DEV_BYPASS_CREDENTIALS: "admin:admin",
  });

  assert.throws(
    () => validateEnv(env, ["frontend"], { requireProdValidation: true }),
    /DEV_BYPASS/,
  );
});

test("validateEnv rejects production CSRF dry-run mode", () => {
  const env = loadProductionEnv({
    BFF_CSRF_GUARD_MODE: "dry-run",
  });

  assert.throws(
    () => validateEnv(env, ["frontend"], { requireProdValidation: true }),
    /BFF_CSRF_GUARD_MODE/,
  );
});

test("validateEnv treats APP_ENV=prod as protected", () => {
  const env = loadProductionEnv({
    APP_ENV: "prod",
    NODE_ENV: "development",
    NEXT_PUBLIC_APP_ENV: "dev",
    BFF_CSRF_GUARD_MODE: "dry-run",
  });

  assert.throws(
    () => validateEnv(env, ["frontend"]),
    /BFF_CSRF_GUARD_MODE/,
  );
});

test("validateEnv treats NEXT_PUBLIC_APP_ENV protected values as protected", () => {
  for (const publicEnv of ["prod", "staging"]) {
    const env = loadProductionEnv({
      APP_ENV: "dev",
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_ENV: publicEnv,
      BFF_CSRF_GUARD_MODE: "dry-run",
    });

    assert.throws(
      () => validateEnv(env, ["frontend"]),
      /BFF_CSRF_GUARD_MODE/,
    );
  }
});

test("validateEnv treats EXPO_PUBLIC_APP_ENV protected values as protected", () => {
  for (const mobileEnv of ["production", "staging"]) {
    const env = loadProductionEnv({
      APP_ENV: "dev",
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_ENV: "dev",
      EXPO_PUBLIC_APP_ENV: mobileEnv,
      BFF_CSRF_GUARD_MODE: "dry-run",
    });

    assert.throws(
      () => validateEnv(env, ["mobile"]),
      /BFF_CSRF_GUARD_MODE/,
    );
  }
});

test("validateEnv rejects production cookie ttl beyond access token ttl", () => {
  const env = loadProductionEnv({
    COOKIE_MAX_AGE: "604800",
    ACCESS_TOKEN_EXPIRE_MINUTES: "60",
  });

  assert.throws(
    () => validateEnv(env, ["frontend"], { requireProdValidation: true }),
    /COOKIE_MAX_AGE/,
  );
});

test("validateEnv rejects production Android App Links without release fingerprint", () => {
  const env = loadProductionEnv({
    ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS: "",
  });

  assert.throws(
    () => validateEnv(env, resolveTargetNames("prod"), { requireProdValidation: true }),
    /ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS/,
  );
});

test("validateEnv rejects production mobile App Link missing from BFF allowlist", () => {
  const env = loadProductionEnv({
    MOBILE_OAUTH_REDIRECT_URIS: "nt208://auth/oauth/callback",
  });

  assert.throws(
    () => validateEnv(env, resolveTargetNames("prod"), { requireProdValidation: true }),
    /MOBILE_OAUTH_REDIRECT_URIS/,
  );
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
  assert.match(mobile, /EXPO_PUBLIC_API_URL=/);
  assert.match(mobile, /EXPO_PUBLIC_WEB_APP_URL=/);
  assert.match(mobile, /EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI=/);
  assert.doesNotMatch(mobile, /AI_PROXY_BASE_URL=/);
  assert.match(notification, /FIREBASE_PROJECT_ID=firebase-project/);
  assert.doesNotMatch(notification, /AI_PROXY_BASE_URL=/);
  assert.match(aiWorker, /AI_PROXY_BASE_URL=http:\/\/localhost:20128\/v1/);
  assert.match(aiWorker, /AI_PROXY_MODEL=oc\/deepseek-v4-flash-free/);
  assert.match(aiWorker, /AI_PROXY_API_KEY=proxy-secret/);
  assert.match(aiWorker, /AI_PROXY_THINKING_MODE=disabled/);
  assert.match(aiWorker, /AI_EMBEDDING_DIMENSION=384/);
  assert.match(aiWorker, /AI_CHAT_MAX_TOKENS=32768/);
  assert.doesNotMatch(aiWorker, /GEMINI_API_KEY=/);
});

test("compose dev does not inherit local AI worker URL from bat env", () => {
  const root = makeTempRoot();
  const env = loadExampleEnv({ AI_WORKER_URL: "http://localhost:8001" });
  const rendered = renderTargets(env, ["backend", "compose-dev"], root);
  for (const file of rendered) writeRenderedFile(file);

  const backend = fs.readFileSync(path.join(root, "backend/.env"), "utf8");
  const composeDev = fs.readFileSync(path.join(root, "infra/docker/.env.dev"), "utf8");

  assert.match(backend, /^AI_WORKER_URL=http:\/\/localhost:8001$/m);
  assert.doesNotMatch(composeDev, /^AI_WORKER_URL=/m);
});

test("mobile local render blanks old emulator defaults for emulator workflows", () => {
  const root = makeTempRoot();
  const env = loadExampleEnv({
    EXPO_PUBLIC_CORE_API_URL: "http://10.0.2.2:8000/",
    EXPO_PUBLIC_CORE_WS_URL: "ws://10.0.2.2:8000/",
    EXPO_PUBLIC_WEB_APP_URL: "http://10.0.2.2:3000/",
  });
  const [mobile] = renderTargets(env, ["mobile"], root);

  assert.match(mobile.content, /^EXPO_PUBLIC_CORE_API_URL=$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_CORE_WS_URL=$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_WEB_APP_URL=$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI=$/m);
});

test("mobile local render preserves explicit LAN overrides", () => {
  const root = makeTempRoot();
  const env = loadExampleEnv({
    EXPO_PUBLIC_CORE_API_URL: "http://192.168.1.10:8000",
    EXPO_PUBLIC_CORE_WS_URL: "ws://192.168.1.10:8000",
    EXPO_PUBLIC_WEB_APP_URL: "http://192.168.1.10:3000",
  });
  const [mobile] = renderTargets(env, ["mobile"], root);

  assert.match(mobile.content, /^EXPO_PUBLIC_CORE_API_URL=http:\/\/192\.168\.1\.10:8000$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_CORE_WS_URL=ws:\/\/192\.168\.1\.10:8000$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_WEB_APP_URL=http:\/\/192\.168\.1\.10:3000$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI=$/m);
});

test("mobile production render preserves HTTPS and WSS values", () => {
  const root = makeTempRoot();
  const env = loadProductionEnv();
  const [mobile] = renderTargets(env, ["mobile"], root);

  assert.match(mobile.content, /^EXPO_PUBLIC_API_URL=https:\/\/healthos\.test$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_CORE_API_URL=https:\/\/api\.healthos\.test$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_WS_URL=wss:\/\/api\.healthos\.test$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_CORE_WS_URL=wss:\/\/api\.healthos\.test$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_WEB_APP_URL=https:\/\/healthos\.test$/m);
  assert.match(mobile.content, /^EXPO_PUBLIC_MOBILE_OAUTH_REDIRECT_URI=https:\/\/healthos\.test\/auth\/oauth\/mobile-callback$/m);
});
