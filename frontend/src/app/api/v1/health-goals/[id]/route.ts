import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

import { CORE_API_URL } from "@/lib/env";

async function getUserIdFromToken(): Promise<string | null> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;
    if (!token) return null;
    const payloadStr = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(payloadStr, "base64").toString());
    return (payload.sub ?? payload.user_id ?? null) as string | null;
  } catch { return null; }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromToken();
  if (!userId) return NextResponse.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 });

  const { id } = await params;
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const body = await req.text();
  const beRes = await fetch(`${CORE_API_URL}/v1/health-goals/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  const beJson = await beRes.json().catch(() => null);
  return NextResponse.json(beJson ?? { error: {} }, { status: beRes.status });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromToken();
  if (!userId) return NextResponse.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 });

  const { id } = await params;
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const beRes = await fetch(`${CORE_API_URL}/v1/health-goals/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const beJson = await beRes.json().catch(() => null);
  return NextResponse.json(beJson ?? { error: {} }, { status: beRes.status });
}
