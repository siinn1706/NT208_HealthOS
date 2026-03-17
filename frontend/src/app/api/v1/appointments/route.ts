// BFF TODO: GET /api/v1/appointments
//   Trigger: Page load on /dashboard/appointments
//   Request: { page?: number; limit?: number }
//   Response: PaginatedResponse<Appointment>

// BFF TODO: POST /api/v1/appointments
//   Trigger: User submits Add Appointment form
//   Request: { appointment_date: string; doctor_name: string; specialty?: string; reason?: string }
//   Response: Appointment

import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/appointments");
}

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/appointments", { method: "POST" });
}
