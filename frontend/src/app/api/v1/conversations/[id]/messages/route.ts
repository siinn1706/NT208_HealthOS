import { NextResponse } from "next/server";
import { MOCK_MESSAGES } from "@/data/chat";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = MOCK_MESSAGES[id] ?? [];
  return NextResponse.json({ data: messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  // TODO: persist when BE is ready
  return NextResponse.json(
    { data: { id: `msg-${Date.now()}`, conversation_id: id, ...body } },
    { status: 201 }
  );
}
