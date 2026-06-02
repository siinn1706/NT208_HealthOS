#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { parseDotenv, stringifyEnvValue } from "./render-env.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DEFAULT_FILES = [
  path.join(DEFAULT_ROOT, "infra/env/.env.master"),
  path.join(DEFAULT_ROOT, "infra/env/.env.master.example"),
];

const HEADER = [
  "# HealthOS master environment.",
  "# Edit infra/env/.env.master, then run:",
  "#   node infra/scripts/render-env.mjs --target all",
  "#",
  "# Generated service env files are overwritten by the renderer; do not edit them directly.",
  "# For cloudflared/preview deploys, the values you usually change are grouped first.",
  "",
];

const MASTER_SECTIONS = [
  [
    "Quick edit: public/tunnel/deploy entrypoints (HTTP and WebSocket)",
    [
      "APP_URL",
      "NEXT_PUBLIC_APP_URL",
      "NEXTAUTH_URL",
      "CORE_API_URL",
      "NEXT_PUBLIC_CORE_WS_URL",
      "EXPO_PUBLIC_CORE_API_URL",
      "EXPO_PUBLIC_CORE_WS_URL",
      "EXPO_PUBLIC_WEB_APP_URL",
      "AI_WORKER_URL",
      "ALLOWED_ORIGINS",
      "ALLOWED_DEV_ORIGINS",
      "BFF_TRUSTED_ORIGINS",
      "OAUTH_GOOGLE_CALLBACK_URL",
      "OAUTH_GOOGLE_LINK_CALLBACK_URL",
      "OAUTH_GITHUB_CALLBACK_URL",
      "OAUTH_GITHUB_LINK_CALLBACK_URL",
      "MOBILE_OAUTH_REDIRECT_URIS",
    ],
  ],
  [
    "Runtime mode",
    ["APP_ENV", "NODE_ENV", "NEXT_PUBLIC_APP_ENV", "DEBUG", "LOG_LEVEL", "LOG_FORMAT"],
  ],
  [
    "Database, Redis, and Docker infrastructure",
    [
      "POSTGRES_DB",
      "POSTGRES_USER",
      "POSTGRES_PASSWORD",
      "DATABASE_URL",
      "REDIS_PASSWORD",
      "REDIS_URL",
      "CELERY_BROKER_URL",
      "CELERY_RESULT_BACKEND",
    ],
  ],
  [
    "Object storage",
    [
      "MINIO_ROOT_USER",
      "MINIO_ROOT_PASSWORD",
      "STORAGE_ENDPOINT",
      "STORAGE_ACCESS_KEY",
      "STORAGE_SECRET_KEY",
      "STORAGE_BUCKET_MEALS",
      "STORAGE_BUCKET_DOCS",
      "STORAGE_USE_SSL",
    ],
  ],
  [
    "Core security",
    [
      "SECRET_KEY",
      "ALGORITHM",
      "ACCESS_TOKEN_EXPIRE_MINUTES",
      "REFRESH_TOKEN_EXPIRE_DAYS",
      "AUTH_ISSUER",
      "AUTH_AUDIENCE",
      "FERNET_KEY",
      "BFF_SHARED_SECRET",
      "BFF_EXCHANGE_ISSUER",
      "BFF_EXCHANGE_AUDIENCE",
      "BFF_EXCHANGE_MAX_AGE_SECONDS",
      "METRICS_TOKEN",
      "METRICS_ALLOW_LOCAL",
    ],
  ],
  [
    "Frontend/BFF auth, cookies, and rate limiting",
    [
      "COOKIE_NAME",
      "COOKIE_MAX_AGE",
      "COOKIE_SECURE",
      "REFRESH_COOKIE_NAME",
      "REFRESH_COOKIE_MAX_AGE",
      "TRUST_PROXY",
      "BFF_CSRF_GUARD_MODE",
      "NEXTAUTH_SECRET",
      "DEV_BYPASS_CREDENTIALS",
    ],
  ],
  ["OAuth provider secrets", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"]],
  ["Public frontend feature flags", ["NEXT_PUBLIC_ONBOARDING_DRAFT_SERVER", "ADMIN_SECURITY_FEED_ENABLED", "ADMIN_AUDIT_FEED_ENABLED"]],
  [
    "Email and notification providers",
    [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASSWORD",
      "SMTP_FROM",
      "SMTP_USE_TLS",
      "FIREBASE_PROJECT_ID",
      "FIREBASE_PRIVATE_KEY",
      "FIREBASE_CLIENT_EMAIL",
    ],
  ],
  [
    "AI worker",
    [
      "AI_MODEL_PATH",
      "AI_CONFIDENCE_THRESHOLD",
      "AI_YOLO_TIMEOUT_SECONDS",
      "AI_FOOD_ANALYSIS_ENABLED",
      "AI_FOOD_ANALYSIS_TIMEOUT_SECONDS",
      "AI_CALORIECLIP_ENABLED",
      "AI_CALORIECLIP_TIMEOUT_SECONDS",
      "AI_CALORIE_RANGE_RATIO",
      "AI_MAX_IMAGE_SIZE_PX",
      "AI_FOOD_ANALYSIS_REPO_ID",
      "AI_CALORIECLIP_REPO_ID",
      "AI_FOOD_ANALYSIS_MODEL_PATH",
      "AI_CALORIECLIP_MODEL_PATH",
      "AI_YOLO_MODEL_PATH",
      "AI_YOLO_GDRIVE_FILE_ID",
      "AI_YOLO_MODEL_SHA256",
      "AI_CLASS_NAMES_PATH",
      "AI_REQUEST_TIMEOUT_SECONDS",
      "AI_ALLOWED_IMAGE_HOSTS",
      "AI_IMAGE_DOWNLOAD_TIMEOUT_SECONDS",
      "AI_BLOCK_PRIVATE_NETWORKS",
      "AI_PROXY_BASE_URL",
      "AI_PROXY_MODEL",
      "AI_PROXY_API_KEY",
      "AI_PROXY_THINKING_MODE",
      "AI_PROXY_REASONING_EFFORT",
      "AI_EMBEDDING_MODEL",
      "AI_EMBEDDING_DIMENSION",
      "AI_EMBEDDING_TIMEOUT_SECONDS",
      "AI_CHAT_MAX_TOKENS",
      "AI_CHAT_TEMPERATURE",
      "AI_CHAT_TIMEOUT_SECONDS",
      "AI_CHAT_STREAM_CHUNK_MIN_CHARS",
    ],
  ],
];

function renderMasterEnv(env) {
  const usedKeys = new Set();
  const lines = [...HEADER];

  for (const [sectionName, keys] of MASTER_SECTIONS) {
    lines.push(`# ${sectionName}`);
    for (const key of keys) {
      if (!(key in env)) continue;
      usedKeys.add(key);
      lines.push(`${key}=${stringifyEnvValue(env[key])}`);
    }
    lines.push("");
  }

  const extraKeys = Object.keys(env).filter((key) => !usedKeys.has(key)).sort();
  if (extraKeys.length > 0) {
    lines.push("# Extra keys not used by the renderer yet");
    for (const key of extraKeys) {
      lines.push(`${key}=${stringifyEnvValue(env[key])}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function parseArgs(argv) {
  const args = { files: [], check: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--check") {
      args.check = true;
    } else if (arg === "--file") {
      args.files.push(path.resolve(argv[++i]));
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node infra/scripts/format-master-env.mjs [--file infra/env/.env.master] [--check]

Formats infra/env/.env.master and infra/env/.env.master.example so the deploy/public
entrypoint values are grouped at the top. Values are not printed.`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const files = args.files.length > 0 ? args.files : DEFAULT_FILES;
  let mismatch = false;
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const current = fs.readFileSync(file, "utf8");
    const formatted = renderMasterEnv(parseDotenv(current));
    const relative = path.relative(DEFAULT_ROOT, file).replaceAll(path.sep, "/");
    if (current === formatted) {
      console.log(`[OK] ${relative}`);
      continue;
    }
    mismatch = true;
    if (args.check) {
      console.log(`[STALE] ${relative}`);
      continue;
    }
    fs.writeFileSync(file, formatted, "utf8");
    console.log(`[WROTE] ${relative}`);
  }

  if (args.check && mismatch) {
    throw new Error("Master env layout is not formatted.");
  }
  console.log("Master env formatting complete. Values were not printed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`[format-master-env] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
