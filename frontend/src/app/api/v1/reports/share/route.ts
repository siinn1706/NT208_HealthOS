/**
 * BFF: POST /api/v1/reports/share
 * Sends a health report to the specified recipients.
 * V1: proxy to notification service via Core BE.
 */
import { NextRequest, NextResponse } from "next/server";
import { shareReport } from "@/lib/reports-data";
import type { ShareRequest } from "@/types/api";

export async function POST(req: NextRequest) {
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

  // TODO V1: proxy to Core BE
  // const coreRes = await fetch(`${process.env.CORE_API_URL}/v1/reports/share`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") ?? "" },
  //   body: JSON.stringify(body),
  // });

  const results = await shareReport(body);
  return NextResponse.json({ data: results });
}
