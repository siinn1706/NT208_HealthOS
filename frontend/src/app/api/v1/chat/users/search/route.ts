/**
 * BFF /api/v1/chat/users/search
 * GET ?q=<query> → search users by display name or email
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/chat/users/search");
}
