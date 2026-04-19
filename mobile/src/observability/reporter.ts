/**
 * Centralized error/event reporter for the mobile app. Today this is a no-op
 * shim that just routes through `console`; swap the implementation here when
 * the team picks Sentry / Bugsnag / Crashlytics — every callsite already goes
 * through these functions, so the change is a one-file edit.
 *
 * Why a shim now?
 *  - Lets `ErrorBoundary`, the API client, and the WS client capture
 *    structured events without rewriting them later.
 *  - Avoids hard-coding a vendor SDK before the team has chosen one.
 *  - Sets up a single audit point for what the app DOES log in production.
 */

import { ApiError } from "@/api/errors";
import { env } from "@/config/env";

type Level = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

interface ReportEventOptions {
  level?: Level;
  context?: Context;
  tags?: Record<string, string>;
}

interface ReporterAdapter {
  captureException(error: unknown, options?: ReportEventOptions): void;
  captureMessage(message: string, options?: ReportEventOptions): void;
  setUser(user: { id: string; email?: string } | null): void;
  setTag(key: string, value: string): void;
}

const consoleAdapter: ReporterAdapter = {
  captureException(error, options) {
    if (env.isProd) return;
    const lvl = options?.level ?? "error";
    const safe = serialize(error);
    if (lvl === "error" || lvl === "warn") {
      console.warn(`[reporter:${lvl}]`, safe, options?.context ?? {});
    }
  },
  captureMessage(message, options) {
    if (env.isProd) return;
    const lvl = options?.level ?? "info";
    if (lvl === "error" || lvl === "warn") {
      console.warn(`[reporter:${lvl}]`, message, options?.context ?? {});
    }
  },
  setUser() {
    /* no-op until vendor wired */
  },
  setTag() {
    /* no-op until vendor wired */
  },
};

let adapter: ReporterAdapter = consoleAdapter;

/**
 * Replace the underlying adapter with a real vendor implementation. Call this
 * once at app startup (after env is loaded) when wiring Sentry/etc.
 *
 * Example (pseudo, after `npm i @sentry/react-native`):
 *   import * as Sentry from "@sentry/react-native";
 *   Sentry.init({ dsn: env.sentryDsn, environment: env.buildChannel });
 *   setReporterAdapter({
 *     captureException: (e, o) => Sentry.captureException(e, { extra: o?.context }),
 *     captureMessage:   (m, o) => Sentry.captureMessage(m, o?.level ?? "info"),
 *     setUser:          (u) => Sentry.setUser(u),
 *     setTag:           (k, v) => Sentry.setTag(k, v),
 *   });
 */
export function setReporterAdapter(next: ReporterAdapter): void {
  adapter = next;
}

export function reportError(error: unknown, context?: Context): void {
  // Domain validation errors are user-facing and shouldn't pollute crash logs.
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return;
  }
  adapter.captureException(error, { level: "error", context });
}

export function reportWarning(message: string, context?: Context): void {
  adapter.captureMessage(message, { level: "warn", context });
}

export function reportInfo(message: string, context?: Context): void {
  adapter.captureMessage(message, { level: "info", context });
}

export function setReporterUser(user: { id: string; email?: string } | null): void {
  adapter.setUser(user);
}

export function setReporterTag(key: string, value: string): void {
  adapter.setTag(key, value);
}

function serialize(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
