import { redirect, unstable_rethrow } from "next/navigation";
import { AppShell } from "@/components/dashboard/shell";
import { AccentColorProvider } from "@/components/providers/accent-color-provider";
import { ThemeModeBootstrap } from "@/components/providers/theme-mode-bootstrap";
import { ClientStorageMigration } from "@/components/providers/client-storage-migration";
import { headers } from "next/headers";

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
 * The meta cookie is now httpOnly so it can't be tampered with from JS, but
 * we still revalidate the real session against Core BE on every dashboard
 * render in case the cookie is stale (e.g. another device just completed
 * onboarding) or the user's session was revoked server-side.
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
  } catch (err) {
    unstable_rethrow(err);
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
      <ClientStorageMigration />
      <AccentColorProvider initialAccent={initialAccent}>
        <AppShell userName={user.name} userAvatar={user.avatarUrl ?? undefined}>
          {children}
        </AppShell>
      </AccentColorProvider>
    </>
  );
}
