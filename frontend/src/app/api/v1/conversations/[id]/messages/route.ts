/**
 * BFF Messages — /api/v1/conversations/:id/messages
 * GET  → paginated message history (?before=<ISO>&limit=<n>)
 * POST → send a message (REST fallback; prefer WebSocket)
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/conversations/${id}/messages`);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/conversations/${id}/messages`, { method: "POST" });
}
