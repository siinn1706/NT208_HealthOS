/**
 * BFF: Emergency Health Card — token list + mint.
 *
 * GET  /api/v1/users/me/emergency-profile/tokens  → list active + revoked tokens
 * POST /api/v1/users/me/emergency-profile/tokens  → mint a new QR token
 *
 * Mint returns the plaintext token + QR data URL exactly once. The FE must
 * surface them in the dialog and never persist them client-side beyond the
 * dialog lifecycle.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

const CORE_PATH = "/v1/users/me/emergency-profile/tokens";

export async function GET(req: NextRequest) {
  return coreProxy(req, CORE_PATH);
}

export async function POST(req: NextRequest) {
  return coreProxy(req, CORE_PATH, { method: "POST" });
}
