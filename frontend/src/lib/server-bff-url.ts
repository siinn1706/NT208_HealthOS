import { isProtectedAppEnv } from "@/lib/env";

const CONFIGURED_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type ServerRequestHeaders = {
  get(name: string): string | null;
};

function firstHeaderValue(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first ? first : null;
}

function requestOriginFromHeaders(reqHeaders: ServerRequestHeaders): string | null {
  const host =
    firstHeaderValue(reqHeaders.get("x-forwarded-host")) ??
    firstHeaderValue(reqHeaders.get("host"));
  if (!host || !/^[A-Za-z0-9.:\-[\]]+$/.test(host)) return null;

  const proto = firstHeaderValue(reqHeaders.get("x-forwarded-proto"));
  const scheme = proto === "https" ? "https" : "http";

  try {
    return new URL(`${scheme}://${host}`).origin;
  } catch {
    return null;
  }
}

export function bffUrl(reqHeaders: ServerRequestHeaders, path: string): string {
  const origin = isProtectedAppEnv()
    ? CONFIGURED_APP_URL
    : requestOriginFromHeaders(reqHeaders) ?? CONFIGURED_APP_URL;
  return new URL(path, origin).toString();
}
