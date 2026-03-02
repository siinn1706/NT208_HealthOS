/**
 * BFF Reminders — today's upcoming schedule.
 * GET  /api/v1/reminders/upcoming
 * POST /api/v1/reminders/upcoming  — ack a reminder (mark done)
 *
 * MVP: returns mock data. V1: proxies to Core BE reminders service.
 */
import { NextRequest, NextResponse } from "next/server";

const MOCK_REMINDERS = [
  {
    id: "r-1",
    type: "medicine",
    title: "Metformin 500mg",
    time: "08:00",
    done: false,
  },
  {
    id: "r-2",
    type: "appointment",
    title: "Khám định kỳ - BS. Minh",
    time: "10:30",
    done: false,
  },
  {
    id: "r-3",
    type: "exercise",
    title: "Bài tập cardio 30 phút",
    time: "17:00",
    done: false,
  },
  {
    id: "r-4",
    type: "medicine",
    title: "Vitamin D3 1000IU",
    time: "20:00",
    done: false,
  },
];

export async function GET() {
  return NextResponse.json({
    status: "success",
    data: MOCK_REMINDERS,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { id } = body ?? {};

  // TODO: forward ack to Core BE
  // await fetch(`${CORE_API_URL}/v1/reminders/${id}/ack`, { method: "POST" });

  if (!id) {
    return NextResponse.json({ error: "Missing reminder id" }, { status: 400 });
  }

  return NextResponse.json({ status: "success", acknowledged: id });
}
