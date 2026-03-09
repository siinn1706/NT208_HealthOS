// BFF TODO: POST /api/v1/meals/analyze-photo
//   Trigger: User submits photo on /dashboard/meals/snap
//   Request: FormData { image: File, meal_type?: string }
//   Response: { job_id: string }
//   Note: This starts an async AI analysis job. Client should poll for results.

// BFF TODO: GET /api/v1/meals/analyze-photo/:job_id
//   Trigger: Polling after photo submission (every 2s up to 30s)
//   Response: {
//     status: "pending" | "processing" | "done" | "failed",
//     result?: { name: string; meal_type: string; ingredients: [...] }
//   }
//   Fallback: Return mock result after delay

import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/meals/analyze-photo", { method: "POST" });
}

// GET with dynamic route param handled by Next.js catch-all or separate file
