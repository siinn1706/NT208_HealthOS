import { NextRequest } from "next/server";

import { coreProxy } from "@/lib/core-api-proxy";

function idempotencyHeaders(req: NextRequest): Record<string, string> {
  const idempotencyKey = req.headers.get("idempotency-key");
  return idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {};
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  return coreProxy(req, "/v1/meals", {
    method: "POST",
    multipart: contentType.includes("multipart/form-data"),
    extraHeaders: idempotencyHeaders(req),
  });
}
