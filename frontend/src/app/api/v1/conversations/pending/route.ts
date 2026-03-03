/**
 * BFF Conversations/pending — /api/v1/conversations/pending
 * GET → list pending (stranger) conversation requests
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/conversations/pending");
}
