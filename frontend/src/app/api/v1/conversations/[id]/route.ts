/**
 * BFF Conversations/[id] — /api/v1/conversations/:id
 * GET   → get single conversation details
 * PATCH → update conversation (title, avatar, mute, etc.)
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/conversations/${id}`);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/conversations/${id}`, { method: "PATCH" });
}
