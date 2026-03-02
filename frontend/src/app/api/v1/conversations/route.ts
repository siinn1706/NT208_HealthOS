import { NextResponse } from "next/server";
import { MOCK_CONVERSATIONS } from "@/data/chat";

export async function GET() {
  return NextResponse.json({ data: MOCK_CONVERSATIONS });
}

export async function POST(request: Request) {
  const body = await request.json();
  // TODO: validate + persist when BE is ready
  return NextResponse.json({ data: { id: `conv-${Date.now()}`, ...body } }, { status: 201 });
}
