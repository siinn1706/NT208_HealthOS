/**
 * BFF Mark Read — /api/v1/conversations/:id/read
 * POST → mark messages as read up to a cursor ({ last_read_message_id })
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/conversations/${id}/read`, { method: "POST" });
}
