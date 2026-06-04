import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";
import { multipartProxy } from "@/lib/bff/multipart-proxy";

// 10 MiB — matches Core docs/standards/api-conventions.md §4.
const MEALS_UPLOAD_LIMIT = 10 * 1024 * 1024;

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/meals");
}

export async function POST(req: NextRequest) {
  // CSRF handled inside coreProxy/multipartProxy via assertSameOrigin (bypassed for Bearer).
  const contentType = req.headers.get("content-type") ?? "";
  const idempotencyKey = req.headers.get("idempotency-key");
  const extraHeaders = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;

  if (contentType.includes("multipart/form-data")) {
    return multipartProxy(req, "/v1/meals", { bodySizeLimit: MEALS_UPLOAD_LIMIT, extraHeaders });
  }
  return coreProxy(req, "/v1/meals", { extraHeaders });
}
