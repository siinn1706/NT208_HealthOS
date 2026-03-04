/**
 * BFF Conversations/direct — /api/v1/conversations/direct
 * POST → create or get a direct conversation (body: { target_user_id })
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/conversations/direct", { method: "POST" });
}
