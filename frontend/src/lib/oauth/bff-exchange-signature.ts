import { createHmac, randomBytes } from "crypto";

export type BffOAuthProfile = {
  provider: string;
  provider_account_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
};

export type SignedBffOAuthProfile = BffOAuthProfile & {
  exchange_issuer: string;
  exchange_audience: string;
  exchange_expires_at: string;
  exchange_nonce: string;
  exchange_signature: string;
};

const EXCHANGE_ISSUER = "healthos-bff";
const EXCHANGE_AUDIENCE = "healthos-core";
const EXCHANGE_TTL_MS = 5 * 60 * 1000;

function canonicalPayload(profile: Omit<SignedBffOAuthProfile, "exchange_signature">): string {
  const payload = {
    avatar_url: profile.avatar_url,
    email: profile.email,
    exchange_audience: profile.exchange_audience,
    exchange_expires_at: profile.exchange_expires_at,
    exchange_issuer: profile.exchange_issuer,
    exchange_nonce: profile.exchange_nonce,
    name: profile.name,
    provider: profile.provider,
    provider_account_id: profile.provider_account_id,
  };
  return JSON.stringify(payload, Object.keys(payload).sort());
}

export function buildSignedBffOAuthProfile(
  profile: BffOAuthProfile,
  secret = process.env.BFF_SHARED_SECRET ?? "",
): SignedBffOAuthProfile {
  const signedProfile = {
    ...profile,
    exchange_issuer: EXCHANGE_ISSUER,
    exchange_audience: EXCHANGE_AUDIENCE,
    exchange_expires_at: new Date(Date.now() + EXCHANGE_TTL_MS).toISOString(),
    exchange_nonce: randomBytes(24).toString("hex"),
  };
  const exchange_signature = createHmac("sha256", secret)
    .update(canonicalPayload(signedProfile))
    .digest("hex");
  return { ...signedProfile, exchange_signature };
}
