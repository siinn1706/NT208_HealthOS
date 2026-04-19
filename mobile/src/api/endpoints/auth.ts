import { apiFetch, unwrapData } from "../client";
import type { SessionUser } from "@/auth/session";

export type OtpPurpose = "signup" | "login" | "reset_password";

/**
 * Matches `app/schemas/auth.py:AuthToken` — flat fields, no nested user object.
 * Source: backend/app/schemas/auth.py.
 */
export interface AuthToken {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  username?: string | null;
  display_name: string;
  avatar_url?: string | null;
  onboarding_status: string;
}

/**
 * Build a partial SessionUser from an AuthToken so we can route immediately
 * after sign-in without an extra round-trip. AuthProvider then refreshes
 * the full profile via fetchCurrentUser() on the next render.
 */
export function authTokenToSessionUser(token: AuthToken): SessionUser {
  return {
    id: token.user_id,
    email: token.email,
    username: token.username ?? null,
    display_name: token.display_name,
    avatar_url: token.avatar_url ?? null,
    onboarding_status: token.onboarding_status,
  };
}

export interface LoginInput {
  identifier: string;
  password: string;
}

/**
 * `password` is only ever sent during the signup-OTP **request** (the backend
 * HIBP-checks it, bcrypt-hashes it, and stores the hash in Redis under
 * `signup:pending:{email}` for 10 minutes). It is NEVER required again on
 * resend or on verify — both reuse the stored hash. Passing the plaintext
 * forward through expo-router params is a security concern, so it stays out
 * of `VerifyOtpInput` and out of any post-register navigation.
 */
export interface RequestOtpInput {
  email: string;
  purpose: OtpPurpose;
  name?: string;
  username?: string;
  password?: string;
}

export interface VerifyOtpInput {
  email: string;
  purpose: OtpPurpose;
  code: string;
}

export interface ResetPasswordInput {
  email: string;
  new_password: string;
}

export interface AvailabilityResult {
  available: boolean;
}

export interface BreachResult {
  breached: boolean;
  count?: number;
}

export async function login(input: LoginInput): Promise<AuthToken> {
  const res = await apiFetch<{ data: AuthToken } | AuthToken>("/v1/auth/login", {
    method: "POST",
    body: input,
    auth: false,
  });
  return unwrapData(res);
}

export async function logout(): Promise<void> {
  await apiFetch<{ data: { success: boolean } } | null>("/v1/auth/logout", {
    method: "POST",
    auth: true,
  }).catch(() => undefined);
}

export async function requestOtp(input: RequestOtpInput) {
  const res = await apiFetch<{
    data: { delivery: string; expires_in_seconds: number; otp?: string };
  }>("/v1/auth/request-otp", {
    method: "POST",
    body: input,
    auth: false,
  });
  return unwrapData(res);
}

export async function verifyOtp(
  input: VerifyOtpInput
): Promise<
  | { kind: "auth"; token: AuthToken }
  | { kind: "next"; email: string; next_step: string }
> {
  const res = await apiFetch<{
    data: AuthToken | { email: string; next_step: string };
  }>("/v1/auth/verify-otp", {
    method: "POST",
    body: input,
    auth: false,
  });
  const data = unwrapData(res);
  if (data && typeof data === "object" && "next_step" in data) {
    return {
      kind: "next",
      email: (data as { email: string }).email,
      next_step: (data as { next_step: string }).next_step,
    };
  }
  return { kind: "auth", token: data as AuthToken };
}

export async function resetPassword(
  input: ResetPasswordInput
): Promise<AuthToken> {
  const res = await apiFetch<{ data: AuthToken } | AuthToken>(
    "/v1/auth/reset-password",
    { method: "POST", body: input, auth: false }
  );
  return unwrapData(res);
}

export async function checkUsername(username: string): Promise<AvailabilityResult> {
  return apiFetch<AvailabilityResult>("/v1/auth/check-username", {
    query: { username },
    auth: false,
  });
}

export async function checkEmail(email: string): Promise<AvailabilityResult> {
  return apiFetch<AvailabilityResult>("/v1/auth/check-email", {
    query: { email },
    auth: false,
  });
}

export async function checkPasswordBreach(password: string): Promise<BreachResult> {
  return apiFetch<BreachResult>("/v1/auth/check-password-breach", {
    method: "POST",
    body: { password },
    auth: false,
  });
}

export async function fetchAuthMe(): Promise<SessionUser> {
  const res = await apiFetch<{ data: SessionUser }>("/v1/auth/me");
  return unwrapData(res);
}

export interface WsTicket {
  ws_ticket: string;
  expires_in_seconds: number;
}

export async function fetchWsTicket(): Promise<WsTicket> {
  const res = await apiFetch<{ data: WsTicket } | WsTicket>("/v1/auth/ws-ticket");
  return unwrapData(res);
}
