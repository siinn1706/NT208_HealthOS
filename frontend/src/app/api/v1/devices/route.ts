/**
 * BFF Devices — wearable device management.
 * GET  /api/v1/devices  — list connected devices
 * POST /api/v1/devices  — connect a new device
 */
import { NextRequest, NextResponse } from "next/server";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

export async function GET() {
  // TODO: auth check
  const res = await fetch(`${CORE_API_URL}/v1/devices`, { next: { revalidate: 0 } });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  // TODO: auth check
  const body = await req.json();
  const res = await fetch(`${CORE_API_URL}/v1/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
