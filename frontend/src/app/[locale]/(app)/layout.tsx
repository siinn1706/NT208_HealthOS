import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AccentColorProvider } from "@/components/providers/accent-color-provider";
import { headers } from "next/headers";

interface SessionResponse {
  data?: {
    email?: string | null;
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  };
}

async function getTopNavUser(): Promise<{ name: string | undefined; avatarUrl: string | null | undefined }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const reqHeaders = await headers();

    const res = await fetch(`${appUrl}/api/v1/auth/session`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });

    if (!res.ok) return { name: undefined, avatarUrl: undefined };

    const json = (await res.json().catch(() => null)) as SessionResponse | null;
    const session = json?.data;
    if (!session) return { name: undefined, avatarUrl: undefined };

    return {
      name:
        session.display_name?.trim() ||
        session.username?.trim() ||
        session.email?.split("@")[0]?.trim() ||
        undefined,
      avatarUrl: session.avatar_url ?? null,
    };
  } catch {
    return { name: undefined, avatarUrl: undefined };
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getTopNavUser();

  let initialAccent: string | null = null;
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const reqHeaders = await headers();
    const res = await fetch(`${appUrl}/api/v1/preferences/me`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      initialAccent = data?.data?.accent_color ?? null;
    }
  } catch {
    // ignore — use null default
  }

  return (
    <AccentColorProvider initialAccent={initialAccent}>
      <DashboardShell userName={user.name} userAvatar={user.avatarUrl ?? undefined}>
        {children}
      </DashboardShell>
    </AccentColorProvider>
  );
}
