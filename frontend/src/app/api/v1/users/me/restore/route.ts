/**
 * BFF — Cancel a pending account deletion (B7 P9).
 *
 * POST /api/v1/users/me/restore → POST /v1/users/me/restore
 *
 * The user must already be signed in (their JWT is allowed by Core's
 * "for-restore" auth dependency even when `deleted_at` is set).
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/users/me/restore", { method: "POST" });
}
