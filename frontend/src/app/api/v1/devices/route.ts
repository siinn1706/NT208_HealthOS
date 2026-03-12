/**
 * BFF Devices — wearable device management.
 * GET  /api/v1/devices  — list connected devices
 * POST /api/v1/devices  — connect a new device
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/devices");
}

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/devices", { method: "POST" });
}
