/**
 * Admin Layout — Server Component
 *
 * Belt-and-suspenders role gate that runs on every admin page render,
 * supplementing the middleware meta-cookie check (R1.7, R2.5, R4.4, R5.7).
 *
 * Flow:
 *  1. Fetch /api/v1/auth/session with the current request cookies.
 *  2. 401 → redirect to /{locale}/login?from=/{locale}/admin
 *  3. !isAdmin(roles, permissions) → redirect to /{locale}/admin/forbidden
 *  4. Otherwise render <AdminShell> around children.
 *
 * Requirements: 1.7, 2.5, 4.7, 5.7
 */

import { redirect, unstable_rethrow } from "next/navigation";
import { cookies } from "next/headers";
import { isAdmin } from "@/lib/admin/admin-session";
import { AdminShell } from "@/components/admin/shell/AdminShell";

// ── Session shape ─────────────────────────────────────────────────────────────

interface SessionData {
  user_id: string | null;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_status: string;
  roles: string[];
  permissions: string[];
}

interface SessionResponse {
  data?: SessionData;
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Forward the session cookie so the BFF can validate the caller.
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let session: SessionData | null = null;

  try {
    const res = await fetch(`${appUrl}/api/v1/auth/session`, {
      cache: "no-store",
      headers: { cookie: cookieHeader },
    });

    if (res.status === 401) {
      redirect(`/${locale}/login?from=/${locale}/admin`);
    }

    if (res.ok) {
      const json = (await res.json().catch(() => null)) as SessionResponse | null;
      session = json?.data ?? null;
    }
  } catch (err) {
    unstable_rethrow(err);
    // On unexpected fetch error treat as non-admin → redirect to forbidden.
  }

  // Server-side role gate: redirect non-admins to the forbidden page.
  if (!session || !isAdmin(session.roles, session.permissions)) {
    redirect(`/${locale}/admin/forbidden`);
  }

  // Derive display name with graceful fallback.
  const displayName =
    session.display_name?.trim() ||
    session.username?.trim() ||
    session.email?.split("@")[0]?.trim() ||
    null;

  return (
    <AdminShell displayName={displayName} avatarUrl={session.avatar_url ?? null}>
      {children}
    </AdminShell>
  );
}
