import { apiFetch, unwrapData } from "../client";

export interface MfaStatus {
  enabled: boolean;
}

export interface MfaSetupResult {
  secret: string;
  qr_code: string;
  recovery_codes: string[];
}

export interface RecoveryCodes {
  enabled: boolean;
  recovery_codes: string[];
}

export async function fetchMfaStatus(): Promise<MfaStatus> {
  const res = await apiFetch<{ data: MfaStatus } | MfaStatus>("/v1/mfa/status");
  return unwrapData(res);
}

export async function setupMfa(): Promise<MfaSetupResult> {
  const res = await apiFetch<{ data: MfaSetupResult } | MfaSetupResult>(
    "/v1/mfa/setup",
    { method: "POST" }
  );
  return unwrapData(res);
}

export async function verifySetup(code: string): Promise<{ enabled: boolean }> {
  const res = await apiFetch<{ data: { enabled: boolean } } | { enabled: boolean }>(
    "/v1/mfa/verify-setup",
    { method: "POST", body: { code } }
  );
  return unwrapData(res);
}

export async function verifyMfa(code: string): Promise<{
  verified: boolean;
  method: "totp" | "recovery_code";
}> {
  const res = await apiFetch<{
    data: { verified: boolean; method: "totp" | "recovery_code" };
  } | { verified: boolean; method: "totp" | "recovery_code" }>("/v1/mfa/verify", {
    method: "POST",
    body: { code },
  });
  return unwrapData(res);
}

export async function disableMfa(code: string): Promise<{ enabled: boolean }> {
  const res = await apiFetch<{ data: { enabled: boolean } } | { enabled: boolean }>(
    "/v1/mfa/disable",
    { method: "POST", body: { code } }
  );
  return unwrapData(res);
}

export async function regenerateRecoveryCodes(code: string): Promise<RecoveryCodes> {
  const res = await apiFetch<{ data: RecoveryCodes } | RecoveryCodes>(
    "/v1/mfa/regenerate-recovery-codes",
    { method: "POST", body: { code } }
  );
  return unwrapData(res);
}
