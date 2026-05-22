/**
 * BFF /api/v1/chat/conversations/[id]/reject
 * POST → reject a pending conversation request
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/chat/conversations/${id}/reject`);
}
