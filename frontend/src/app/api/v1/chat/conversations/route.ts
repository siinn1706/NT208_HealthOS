/**
 * BFF /api/v1/chat/conversations
 * GET  → list accepted conversations
 * POST → create / get a direct conversation (body: { target_user_id })
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/chat/conversations");
}

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/chat/conversations");
}
