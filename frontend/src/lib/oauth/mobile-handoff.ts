import { CORE_API_URL } from "@/lib/env";
import type { OAuthContext, OAuthProvider } from "@/lib/oauth/flow-context";
import type { SignedBffOAuthProfile } from "@/lib/oauth/bff-exchange-signature";

interface MobileOAuthHandoffPayload {
  data?: {
    code?: unknown;
    expires_in_seconds?: unknown;
  };
  detail?: {
    code?: unknown;
    message?: unknown;
  };
  error?: {
    code?: unknown;
    message?: unknown;
  };
}

export class MobileOAuthHandoffError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "MobileOAuthHandoffError";
    this.status = status;
    this.code = code;
  }
}

export function isMobileOAuthFlow(
  context: OAuthContext,
): context is OAuthContext & { mobileRedirectUri: string } {
  return Boolean(context.mobileRedirectUri);
}

export function buildMobileOAuthRedirectUrl(
  context: OAuthContext & { mobileRedirectUri: string },
  params: Record<string, string>,
): string {
  const url = new URL(context.mobileRedirectUri);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

export async function createMobileOAuthHandoffCode(
  profile: SignedBffOAuthProfile,
  mobileState: string,
  mobileCodeChallenge: string,
): Promise<string> {
  const res = await fetch(`${CORE_API_URL}/v1/auth/mobile-oauth/handoff`, {
    cache: "no-store",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BFF-Secret": process.env.BFF_SHARED_SECRET ?? "",
    },
    body: JSON.stringify({
      ...profile,
      mobile_state: mobileState,
      mobile_code_challenge: mobileCodeChallenge,
    }),
  });
  const payload = (await res.json().catch(() => null)) as MobileOAuthHandoffPayload | null;
  const code = payload?.data?.code;
  if (res.ok && typeof code === "string" && code.trim()) {
    return code;
  }

  const errorCode = String(payload?.detail?.code ?? payload?.error?.code ?? "MOBILE_OAUTH_HANDOFF_FAILED");
  const errorMessage = String(payload?.detail?.message ?? payload?.error?.message ?? "Mobile OAuth handoff failed.");
  throw new MobileOAuthHandoffError(errorMessage, res.status, errorCode);
}

export function mobileOAuthErrorRedirect(
  context: OAuthContext,
  provider: OAuthProvider,
  error: string,
  mobileState?: string | null,
): string | null {
  if (!isMobileOAuthFlow(context)) return null;
  return buildMobileOAuthRedirectUrl(context, {
    provider,
    error,
    ...(mobileState ? { state: mobileState } : {}),
  });
}
