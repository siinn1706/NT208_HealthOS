import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChatLayout } from "@/components/dashboard/chat";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("chat");
  return { title: t("title") };
}

export default function ChatRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // DashboardShell removes p-6 for chat routes; we just need to fill the available h-full.
  // children (page.tsx) returns null — ChatLayout owns the full UI.
  return (
    <div className="h-full flex flex-col">
      <ChatLayout />
      {children}
    </div>
  );
}
