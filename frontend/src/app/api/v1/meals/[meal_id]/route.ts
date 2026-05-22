import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ meal_id: string }> },
) {
  const { meal_id } = await params;
  return coreProxy(req, `/v1/meals/${meal_id}`);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ meal_id: string }> },
) {
  const { meal_id } = await params;
  return coreProxy(req, `/v1/meals/${meal_id}`, { method: "PATCH" });
}
