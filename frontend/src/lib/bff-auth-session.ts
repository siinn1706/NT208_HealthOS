import { NextResponse } from "next/server";
import {
  META_COOKIE_NAME,
  REFRESH_COOKIE_MAX_AGE,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_SECURE,
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
} from "@/lib/bff-auth-cookie";
import { fetchWithTimeout } from "@/lib/bff-fetch-utils";
import { CORE_API_URL } from "@/lib/env";
import { isAdmin } from "@/lib/admin/admin-session";

const DEFAULT_ONBOARDING_STATUS = "pending";

/**
 * Secret fields that must never appear in any session response at any depth.
 * R4.3 / Property 11.
 */
const SECRET_FIELDS = new Set([
  "access_token",
  "refresh_token",
  "mfa_secret",
  "mfa_recovery_codes",
  "password_hash",
  "oauth_token",
  "session_cookie",
]);

/**
 * Recursively strip SECRET_FIELDS from any plain-object tree.
 * Arrays are traversed element-by-element; primitives are returned as-is.
 */
export function stripSecretFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripSecretFields);
  }
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (!SECRET_FIELDS.has(k)) {
        out[k] = stripSecretFields(v);
      }
    }
    return out;
  }
  return value;
}

/** Regex for valid role/permission identifiers (R4.1, R4.2). */
const IDENTIFIER_RE = /^[a-z0-9_.:-]+$/;

/**
 * Filter and cap an identifier array per the session schema constraints.
 * - maxItems: maximum number of items to keep
 * - minLen / maxLen: per-item length bounds
 * - Items that don't match IDENTIFIER_RE or fall outside length bounds are dropped.
 */
export function filterIdentifierArray(
  raw: unknown,
  maxItems: number,
  minLen: number,
  maxLen: number,
): string[] {
  if (!Array.isArray(raw)) return [];
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    if (item.length < minLen || item.length > maxLen) continue;
    if (!IDENTIFIER_RE.test(item)) continue;
    result.push(item);
    if (result.length >= maxItems) break;
  }
  return result;
}

export interface CoreAuthPayload {
  access_token: string;
  refresh_token?: string | null;
  user_id?: string;
  email?: string;
  username?: string | null;
  display_name?: string;
  avatar_url?: string | null;
  onboarding_status?: string | null;
  roles?: string[];
  permissions?: string[];
}

export interface SessionUserSnapshot {
  user_id: string | null;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_status: string;
  roles: string[];
  permissions: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNullableString(value: unknown): string | null {
  if (value === null) return null;
  return readString(value);
}

function readOnboardingStatus(value: unknown): string {
  const status = readString(value);
  return status ?? DEFAULT_ONBOARDING_STATUS;
}

export function readCoreAuthPayload(payload: unknown): CoreAuthPayload | null {
  if (!isRecord(payload) || !isRecord(payload.data)) return null;
  const data = payload.data;
  const accessToken = readString(data.access_token);
  if (!accessToken) return null;
  return {
    access_token: accessToken,
    refresh_token: readNullableString(data.refresh_token),
    user_id: readString(data.user_id) ?? undefined,
    email: readString(data.email) ?? undefined,
    username: readNullableString(data.username),
    display_name: readString(data.display_name) ?? undefined,
    avatar_url: readNullableString(data.avatar_url),
    onboarding_status: readNullableString(data.onboarding_status),
    roles: filterIdentifierArray(data.roles, 32, 1, 64),
    permissions: filterIdentifierArray(data.permissions, 256, 1, 128),
  };
}

/**
 * Build a SessionUserSnapshot from a raw Core /v1/auth/me response.
 * Unlike readCoreAuthPayload, this does NOT require an access_token in the
 * response body (the token is already held in the session cookie).
 * Returns null if the payload is not a valid record with a data object.
 */
export function readCoreSessionSnapshot(payload: unknown): SessionUserSnapshot | null {
  if (!isRecord(payload) || !isRecord(payload.data)) return null;
  const data = payload.data;
  return {
    user_id: readString(data.user_id) ?? readString(data.id),
    email: readString(data.email),
    username: readNullableString(data.username),
    display_name: readString(data.display_name),
    avatar_url: readNullableString(data.avatar_url),
    onboarding_status: readOnboardingStatus(data.onboarding_status),
    roles: filterIdentifierArray(data.roles, 32, 1, 64),
    permissions: filterIdentifierArray(data.permissions, 256, 1, 128),
  };
}

export function sessionUserFromCoreAuth(auth: CoreAuthPayload): SessionUserSnapshot {
  return {
    user_id: auth.user_id ?? null,
    email: auth.email ?? null,
    username: auth.username ?? null,
    display_name: auth.display_name ?? null,
    avatar_url: auth.avatar_url ?? null,
    onboarding_status: readOnboardingStatus(auth.onboarding_status),
    roles: auth.roles ?? [],
    permissions: auth.permissions ?? [],
  };
}

export function applyAuthCookies(response: NextResponse, auth: CoreAuthPayload): void {
  response.cookies.set(SESSION_COOKIE_NAME, auth.access_token, {
    httpOnly: true,
    secure: SESSION_COOKIE_SECURE,
    sameSite: "lax",
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
  });

  response.cookies.set(
    META_COOKIE_NAME,
    JSON.stringify({
      onboarding_status: readOnboardingStatus(auth.onboarding_status),
      is_admin: isAdmin(auth.roles ?? [], auth.permissions ?? []),
    }),
    {
      httpOnly: true,
      secure: SESSION_COOKIE_SECURE,
      sameSite: "lax",
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: "/",
    },
  );

  const refreshToken = readString(auth.refresh_token);
  if (refreshToken) {
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: REFRESH_COOKIE_SECURE,
      sameSite: "lax",
      maxAge: REFRESH_COOKIE_MAX_AGE,
      path: "/",
    });
    return;
  }

  response.cookies.delete(REFRESH_COOKIE_NAME);
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(META_COOKIE_NAME);
  response.cookies.delete(REFRESH_COOKIE_NAME);
}

export async function refreshCoreAuth(
  refreshToken: string,
): Promise<{ ok: true; auth: CoreAuthPayload } | { ok: false; status: number }> {
  try {
    const coreRes = await fetchWithTimeout(`${CORE_API_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    const payload = await coreRes.json().catch(() => null);
    if (!coreRes.ok) {
      return { ok: false, status: coreRes.status || 401 };
    }
    const auth = readCoreAuthPayload(payload);
    if (!auth) {
      return { ok: false, status: 502 };
    }
    return { ok: true, auth };
  } catch {
    return { ok: false, status: 502 };
  }
}

export async function revokeCoreSession(
  accessToken: string | null,
  refreshToken: string | null,
): Promise<void> {
  const headers: Record<string, string> = {};
  let body: string | undefined;

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (refreshToken) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ refresh_token: refreshToken });
  }

  try {
    await fetchWithTimeout(`${CORE_API_URL}/v1/auth/logout`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    // Best effort only.
  }
}
