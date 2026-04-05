// BFF TODO: GET /api/v1/reminders
//   Trigger: Client-side load on /dashboard/reminders
//   Request: { type?: "medicine" | "appointment" | "exercise" }
//   Response: { data: Reminder[] }

// BFF TODO: POST /api/v1/reminders
//   Trigger: User submits AddReminderDialog
//   Request: { type: string; title: string; time: string; repeat?: string; note?: string }
//   Response: Reminder

import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/reminders");
}

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/reminders", { method: "POST" });
}
