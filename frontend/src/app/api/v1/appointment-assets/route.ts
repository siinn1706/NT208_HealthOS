/**
 * BFF — Current user's appointment assets.
 *
 * GET /api/v1/appointment-assets?kind=lab_report
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/appointment-assets");
}
