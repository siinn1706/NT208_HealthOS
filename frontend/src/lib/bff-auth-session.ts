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

const DEFAULT_ONBOARDING_STATUS = "pending";

export interface CoreAuthPayload {
  access_token: string;
  refresh_token?: string | null;
  user_id?: string;
  email?: string;
  username?: string | null;
  display_name?: string;
  avatar_url?: string | null;
  onboarding_status?: string | null;
}

export interface SessionUserSnapshot {
  user_id: string | null;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_status: string;
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
