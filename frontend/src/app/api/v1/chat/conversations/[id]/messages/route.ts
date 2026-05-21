/**
 * BFF /api/v1/chat/conversations/[id]/messages
 * GET ?before=<iso>&limit=<n> → paginated message history (newest-first)
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/chat/conversations/${id}/messages`);
}
