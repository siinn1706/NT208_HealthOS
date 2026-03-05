/**
 * BFF Conversations — /api/v1/conversations
 * GET  → list accepted conversations
 * POST → create a group conversation (body: { title, member_ids, avatar_url? })
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/conversations");
}

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/conversations", { method: "POST" });
}
