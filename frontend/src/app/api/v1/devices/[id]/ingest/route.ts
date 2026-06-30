import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

type Params = { params: Promise<{ id: string }> };

function idempotencyHeaders(req: NextRequest): Record<string, string> | undefined {
  const idempotencyKey = req.headers.get("idempotency-key");
  return idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return coreProxy(req, `/v1/devices/${encodeURIComponent(id)}/ingest`, {
    method: "POST",
    extraHeaders: idempotencyHeaders(req),
  });
}
