// BFF TODO: GET /api/v1/meals/analyze-photo/:job_id
//   Trigger: Polling after photo submission (every 2s up to 30s)
//   Response: {
//     status: "pending" | "processing" | "done" | "failed",
//     result?: { name: string; meal_type: string; ingredients: [...] }
//   }
//   Fallback: Return mock result for demo

import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const { job_id } = await params;
  return coreProxy(req, `/v1/meals/analyze-photo/${job_id}`);
}
