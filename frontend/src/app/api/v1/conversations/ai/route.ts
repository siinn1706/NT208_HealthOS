/**
 * Chat AI conversation BFF — proxy to Core BE.
 * POST /api/v1/conversations/ai → POST /v1/conversations/ai
 *
 * Mobile calls this to start a fresh AI conversation, optionally with an
 * initial user message. Body shape: { initial_message?: string }.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return coreProxy(req, "/v1/conversations/ai", { method: "POST", body });
}
