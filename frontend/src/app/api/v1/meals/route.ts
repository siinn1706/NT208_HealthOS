import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { assertSameOrigin } from "@/lib/bff-origin-guard";
import { CORE_API_URL } from "@/lib/env";

async function getAccessToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

function unauthorized() {
  return NextResponse.json(
    { error: { code: "AUTH_REQUIRED", message: "Authentication required." } },
    { status: 401 }
  );
}

export async function GET(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return unauthorized();

  const coreUrl = new URL("/v1/meals", CORE_API_URL);
  req.nextUrl.searchParams.forEach((value, key) => coreUrl.searchParams.set(key, value));

  try {
    const res = await fetch(coreUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_UNAVAILABLE", message: "Core service is temporarily unavailable." } },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  const token = await getAccessToken();
  if (!token) return unauthorized();

  const contentType = req.headers.get("content-type") ?? "";
  const idempotencyKey = req.headers.get("idempotency-key");

  try {
    let body: BodyInit | undefined;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    if (contentType.includes("multipart/form-data")) {
      // Body-size cap: reject requests over 20MB to prevent BFF OOM on large multipart uploads.
      // coreProxy does not yet support multipart streaming, so we buffer here with a hard limit.
      const MAX_BODY_BYTES = 20 * 1024 * 1024;
      const contentLength = req.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
        return NextResponse.json(
          { error: { code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds 20MB limit." } },
          { status: 413 }
        );
      }
      body = await req.formData();
    } else {
      body = await req.text();
      if (contentType) headers["Content-Type"] = contentType;
    }

    const res = await fetch(`${CORE_API_URL}/v1/meals`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_UNAVAILABLE", message: "Core service is temporarily unavailable." } },
      { status: 503 }
    );
  }
}
