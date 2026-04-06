import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AccentColorProvider } from "@/components/providers/accent-color-provider";
import { ThemeModeBootstrap } from "@/components/providers/theme-mode-bootstrap";
import { headers } from "next/headers";
import { getLocaleFromPathname } from "@/lib/locale-path";

interface SessionResponse {
  data?: {
    email?: string | null;
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    onboarding_status?: string | null;
  };
}

/**
 * Server-side onboarding gate: supplements the middleware cookie check.
 * The middleware's meta cookie is client-modifiable (non-httpOnly), so a
 * user could forge `onboarding_status: "completed"` to reach the dashboard.
 * This RSC validates the real session from Core BE on every dashboard render.
 */
async function getSessionAndGuard(locale: string): Promise<{
  name: string | undefined;
  avatarUrl: string | null | undefined;
}> {
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

    // Server-side guard: redirect to onboarding if not yet completed
    if (session.onboarding_status && session.onboarding_status !== "completed") {
      redirect(`/${locale}/onboarding`);
    }

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
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getSessionAndGuard(locale);

  let initialAccent: string | null = null;
  let initialThemeMode: "system" | "light" | "dark" | null = null;
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
      const tm = data?.data?.theme_mode;
      if (tm === "system" || tm === "light" || tm === "dark") {
        initialThemeMode = tm;
      }
    }
  } catch {
    // ignore — use null default
  }

  return (
    <>
      <ThemeModeBootstrap serverThemeMode={initialThemeMode} />
      <AccentColorProvider initialAccent={initialAccent}>
        <DashboardShell userName={user.name} userAvatar={user.avatarUrl ?? undefined}>
          {children}
        </DashboardShell>
      </AccentColorProvider>
    </>
  );
}
