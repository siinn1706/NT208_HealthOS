/**
 * BFF Conversations/[id]/members/[userId]/role
 * POST → promote or demote a member's role (owner only)
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params;
  return coreProxy(req, `/v1/conversations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}/role`, { method: "POST" });
}
