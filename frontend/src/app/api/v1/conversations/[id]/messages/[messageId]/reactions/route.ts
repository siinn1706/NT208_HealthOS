/**
 * BFF Message Reactions — /api/v1/conversations/:id/messages/:messageId/reactions
 * POST → toggle an emoji reaction
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  return coreProxy(req, `/v1/conversations/${id}/messages/${messageId}/reactions`, { method: "POST" });
}
