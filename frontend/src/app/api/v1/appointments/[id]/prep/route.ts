/**
 * Appointment prep checklist BFF — proxy to Core BE.
 * GET   /api/v1/appointments/{id}/prep → GET   /v1/appointments/{id}/prep
 * PATCH /api/v1/appointments/{id}/prep → PATCH /v1/appointments/{id}/prep
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return coreProxy(req, `/v1/appointments/${id}/prep`, { method: "GET" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  return coreProxy(req, `/v1/appointments/${id}/prep`, { method: "PATCH", body });
}
