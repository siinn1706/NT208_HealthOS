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

export async function POST(req: NextRequest) {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const contentType = req.headers.get("content-type") ?? "";

  try {
    let body: BodyInit | undefined;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (contentType.includes("multipart/form-data")) {
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
