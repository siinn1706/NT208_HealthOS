/**
 * BFF — Request a PDF report render (B7 P10).
 *
 * POST /api/v1/reports/export-pdf → POST /v1/reports/export-pdf
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/reports/export-pdf", { method: "POST" });
}
