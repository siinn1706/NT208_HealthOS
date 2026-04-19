/**
 * BFF Nutrition — bilingual ingredient catalog (B7 P2).
 *
 * GET /api/v1/nutrition/ingredients?q=&category=&page=&per_page=
 *   → GET /v1/nutrition/ingredients
 *
 * Thin proxy: query params are forwarded verbatim by `coreProxy`.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/nutrition/ingredients");
}
