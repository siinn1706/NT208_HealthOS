/**
 * BFF Auth Context — unifies cookie (web) + Authorization: Bearer (mobile) auth.
 *
 * Cookie wins when both are present (matches `coreProxy()` precedence). The
 * principal is user-bucketed so the same human via either transport shares a
 * single rate-limit / cache bucket. JWT signature is NOT verified — these are
 * BFF-internal bucketing decisions, not authorization. Core BE remains the
 * sole authority for token validity.
 */
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

export type BffAuthContext = {
  token: string | null;
  kind: "cookie" | "bearer" | "none";
  /** User-bucketed principal for rate-limit / cache keys. `user:${sub}` if JWT decodes, `tk:${sha256(token)[0..8]}` otherwise. */
  principal: string | null;
};

function deriveUserId(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadStr = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(payloadStr, "base64").toString()) as Record<string, unknown>;
    const sub = payload.sub ?? payload.user_id;
    if (sub == null) return null;
    const s = String(sub);
    return s.length === 0 ? null : s;
  } catch {
    return null;
  }
}

function derivePrincipal(token: string): string {
  const userId = deriveUserId(token);
  if (userId) return `user:${userId}`;
  const hash = createHash("sha256").update(token).digest("hex").slice(0, 8);
  return `tk:${hash}`;
}

function readBearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const t = h.slice(7).trim();
  return t || null;
}

export async function getBffAuthContext(req: NextRequest): Promise<BffAuthContext> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  if (cookieToken) {
    return { token: cookieToken, kind: "cookie", principal: derivePrincipal(cookieToken) };
  }
  const bearer = readBearer(req);
  if (bearer) {
    return { token: bearer, kind: "bearer", principal: derivePrincipal(bearer) };
  }
  return { token: null, kind: "none", principal: null };
}
