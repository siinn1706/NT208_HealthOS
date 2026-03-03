/**
 * BFF Pin/Unpin Message — /api/v1/conversations/:id/pinned/:messageId
 * POST   → pin a message
 * DELETE → unpin a message
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  return coreProxy(req, `/v1/conversations/${id}/pinned/${messageId}`, { method: "POST" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  return coreProxy(req, `/v1/conversations/${id}/pinned/${messageId}`, { method: "DELETE" });
}
