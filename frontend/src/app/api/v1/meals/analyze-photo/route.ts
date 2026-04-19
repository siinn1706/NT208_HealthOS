/**
 * POST /api/v1/meals/analyze-photo
 *
 * Trigger: User submits a photo from /dashboard/meals/snap.
 * Request:  multipart/form-data { image: File, meal_type?: string }
 * Response: { job_id: string }
 *
 * The browser submits raw multipart/form-data — we forward it to Core BE as-is
 * (preserving the boundary in Content-Type) using the multipart proxy branch.
 * Cap is 10 MiB to match Core's accepted upload size (UX plan §I).
 *
 * GET /api/v1/meals/analyze-photo/:job_id is handled in the [job_id]/ route.
 */

import { NextRequest } from "next/server";
import { multipartProxy } from "@/lib/bff/multipart-proxy";

export async function POST(req: NextRequest) {
  return multipartProxy(req, "/v1/meals/analyze-photo");
}
