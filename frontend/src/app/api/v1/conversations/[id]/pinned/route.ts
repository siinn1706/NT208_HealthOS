/**
 * BFF Pinned Messages — /api/v1/conversations/:id/pinned
 * GET → list pinned messages in a conversation
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/conversations/${id}/pinned`);
}
