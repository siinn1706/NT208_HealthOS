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

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: { code: "NOT_IMPLEMENTED", message: "Report sharing is not yet available." } },
      { status: 501 }
    );
  }
  const results = await shareReport(body);
  return NextResponse.json({ data: results });
}
