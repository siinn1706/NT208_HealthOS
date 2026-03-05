import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/reminders/upcoming");
}

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/reminders/upcoming", { method: "POST" });
}
