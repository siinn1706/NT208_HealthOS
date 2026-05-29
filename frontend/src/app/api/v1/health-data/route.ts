import { NextRequest, NextResponse } from "next/server";

import { coreProxy } from "@/lib/core-api-proxy";

const REPLACEMENT_ROUTES = [
  "/api/v1/dashboard/summary",
  "/api/v1/vitals/timeseries",
  "/api/v1/meals",
] as const;

function idempotencyHeaders(req: NextRequest): Record<string, string> {
  const idempotencyKey = req.headers.get("idempotency-key");
  return idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {};
}

export async function GET() {
  return NextResponse.json(
    {
      error: {
        code: "ENDPOINT_GONE",
        message: "The legacy health-data aggregate endpoint is no longer available.",
        details: { replacements: REPLACEMENT_ROUTES },
      },
    },
    { status: 410 },
  );
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  return coreProxy(req, "/v1/meals", {
    method: "POST",
    multipart: contentType.includes("multipart/form-data"),
    extraHeaders: idempotencyHeaders(req),
  });
}
