/**
 * BFF Conversations/group — /api/v1/conversations/group
 * POST → create a new group conversation
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/conversations", { method: "POST" });
}
