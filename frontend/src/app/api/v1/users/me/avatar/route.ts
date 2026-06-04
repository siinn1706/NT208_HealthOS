/**
 * BFF — POST multipart avatar to Core BE /v1/users/me/avatar.
 *
 * Dual-auth via multipartProxy (cookie precedence; bearer fallback). 5 MiB cap
 * — stricter than meals (10 MiB) because avatar is a profile thumbnail.
 * CSRF handled inside multipartProxy via assertSameOrigin (bypassed for Bearer).
 */
import { NextRequest } from "next/server";
import { multipartProxy } from "@/lib/bff/multipart-proxy";

const AVATAR_UPLOAD_LIMIT = 5 * 1024 * 1024; // 5 MiB.

export async function POST(req: NextRequest) {
  return multipartProxy(req, "/v1/users/me/avatar", { bodySizeLimit: AVATAR_UPLOAD_LIMIT });
}
