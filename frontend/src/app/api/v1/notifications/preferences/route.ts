import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/notifications/preferences");
}

export async function PATCH(req: NextRequest) {
  return coreProxy(req, "/v1/notifications/preferences", { method: "PATCH" });
}
