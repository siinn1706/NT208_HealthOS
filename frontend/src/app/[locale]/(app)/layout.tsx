import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { headers } from "next/headers";

interface SessionResponse {
  data?: {
    email?: string | null;
    username?: string | null;
    display_name?: string | null;
  };
}

async function getTopNavUserName(): Promise<string | undefined> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const reqHeaders = await headers();

    const res = await fetch(`${appUrl}/api/v1/auth/session`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });

    if (!res.ok) return undefined;

    const json = (await res.json().catch(() => null)) as SessionResponse | null;
    const session = json?.data;
    if (!session) return undefined;

    return (
      session.display_name?.trim() ||
      session.username?.trim() ||
      session.email?.split("@")[0]?.trim() ||
      undefined
    );
  } catch {
    return undefined;
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userName = await getTopNavUserName();

  return (
    <DashboardShell userName={userName}>
      {children}
    </DashboardShell>
  );
}
