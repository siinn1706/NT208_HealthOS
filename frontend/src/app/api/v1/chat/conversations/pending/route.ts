/**
 * BFF /api/v1/chat/conversations/pending
 * GET → list pending (stranger-request) conversations
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/chat/conversations/pending");
}
