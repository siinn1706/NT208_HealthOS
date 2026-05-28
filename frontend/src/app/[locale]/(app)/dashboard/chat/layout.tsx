import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ChatLayout } from "@/components/dashboard/chat";

interface SessionResponse {
  data?: {
    user_id?: string | null;
    id?: string | null;
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("chat");
  return { title: t("title") };
}

async function getInitialCurrentUserId(): Promise<string | null> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const cookieStore = await cookies();
    const res = await fetch(`${appUrl}/api/v1/auth/session`, {
      cache: "no-store",
      headers: { cookie: cookieStore.toString() },
    });

    if (!res.ok) return null;

    const json = (await res.json().catch(() => null)) as SessionResponse | null;
    const userId = json?.data?.user_id ?? json?.data?.id;
    return typeof userId === "string" && userId.trim() ? userId : null;
  } catch {
    return null;
  }
}

export default async function ChatRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialCurrentUserId = await getInitialCurrentUserId();

  // AppShell does not pad chat routes; we just fill the available h-full.
  // children (page.tsx) returns null — ChatLayout owns the full UI.
  return (
    <div className="h-full flex flex-col">
      <ChatLayout initialCurrentUserId={initialCurrentUserId} />
      {children}
    </div>
  );
}
