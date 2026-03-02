import { NextResponse } from "next/server";
import { MOCK_CONVERSATIONS } from "@/data/chat";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conversation = MOCK_CONVERSATIONS.find((c) => c.id === id);
  if (!conversation) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, { status: 404 });
  return NextResponse.json({ data: conversation });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  // TODO: persist when BE is ready
  return NextResponse.json({ data: { id, ...body } });
}
