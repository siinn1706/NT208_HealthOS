/**
 * BFF Messages/[messageId] — /api/v1/conversations/:id/messages/:messageId
 * PATCH  → edit a message
 * DELETE → recall (soft-delete) a message
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  return coreProxy(req, `/v1/conversations/${id}/messages/${messageId}`, { method: "PATCH" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  return coreProxy(req, `/v1/conversations/${id}/messages/${messageId}`, { method: "DELETE" });
}
