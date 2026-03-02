import { NextRequest, NextResponse } from "next/server";
import { MOCK_USERS } from "@/data/chat";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") ?? "";
  if (!email || email.length < 2) {
    return NextResponse.json({ data: [] });
  }
  const results = MOCK_USERS.filter((u) =>
    u.email.toLowerCase().includes(email.toLowerCase()) ||
    u.display_name.toLowerCase().includes(email.toLowerCase())
  );
  return NextResponse.json({ data: results });
}
