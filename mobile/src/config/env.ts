import Constants from "expo-constants";

type BuildChannel = "dev" | "staging" | "prod";

interface AppExtra {
  coreApiUrl: string;
  coreWsUrl: string;
  buildChannel: BuildChannel;
  aiFeaturesEnabled: boolean;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppExtra>;

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(
      `[env] ${name} is not set. Define it in app.config.ts extras or via EXPO_PUBLIC_${name}.`
    );
  }
  return value;
}

function validateHttpUrl(value: string, name: string): string {
  const url = value.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      `[env] ${name} must start with http:// or https:// — got "${value}".`
    );
  }
  if (url.endsWith("/")) {
    return url.slice(0, -1);
  }
  return url;
}

function validateWsUrl(value: string, name: string): string {
  const url = value.trim();
  if (!/^wss?:\/\//i.test(url)) {
    throw new Error(
      `[env] ${name} must start with ws:// or wss:// — got "${value}".`
    );
  }
  if (url.endsWith("/")) {
    return url.slice(0, -1);
  }
  return url;
}

const channel = (extra.buildChannel ?? "dev") as BuildChannel;
const isProd = channel === "prod";

const coreApiUrl = validateHttpUrl(
  required(extra.coreApiUrl, "CORE_API_URL"),
  "CORE_API_URL"
);
const coreWsUrl = validateWsUrl(
  required(extra.coreWsUrl, "CORE_WS_URL"),
  "CORE_WS_URL"
);

// Production guardrail: prevent shipping a build that talks to a non-TLS host.
if (isProd && coreApiUrl.startsWith("http://")) {
  throw new Error(
    "[env] Production builds must use https:// for CORE_API_URL."
  );
}
if (isProd && coreWsUrl.startsWith("ws://")) {
  throw new Error(
    "[env] Production builds must use wss:// for CORE_WS_URL."
  );
}

export const env = {
  coreApiUrl,
  coreWsUrl,
  buildChannel: channel,
  aiFeaturesEnabled: extra.aiFeaturesEnabled ?? false,
  isDev: channel === "dev",
  isProd,
};

export type Env = typeof env;
