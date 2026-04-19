/**
 * BFF — Medication Hub list + create.
 *
 *   GET  /api/v1/medications?status=active|paused|completed|cancelled|all
 *     → GET  /v1/medications
 *
 *   POST /api/v1/medications
 *     → POST /v1/medications        body: MedicationPlanCreateBody
 *
 * Pure proxy — no business logic per `docs/standards/api-conventions.md`.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/medications");
}

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/medications", { method: "POST" });
}
