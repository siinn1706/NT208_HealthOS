/**
 * BFF Conversations/[id]/members/[userId]
 * DELETE → remove a member from a group conversation (owner/admin only)
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params;
  return coreProxy(req, `/v1/conversations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" });
}
