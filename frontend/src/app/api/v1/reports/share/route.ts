/**
 * BFF: POST /api/v1/reports/share
 * Sends a health report to the specified recipients.
 * V1: proxy to notification service via Core BE.
 */
import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/bff-origin-guard";
import { shareReport } from "@/lib/reports-data";
import type { ShareRequest } from "@/types/api";

export async function POST(req: NextRequest) {
  assertSameOrigin(req);

  let body: ShareRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.report_id || !body.recipients?.length || !body.channels?.length) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "report_id, recipients, and channels are required" } },
      { status: 400 }
    );
  }

  // TODO: proxy to Core BE once /v1/reports/share is implemented.
  // For now, shareReport() is a local stub that simulates delivery results.
  // Replace with:
  //   const coreRes = await coreProxy(req, "/v1/reports/share");
  //   return new NextResponse(coreRes.body, { status: coreRes.status, headers: coreRes.headers });
  const results = await shareReport(body);
  return NextResponse.json({ data: results });
}
