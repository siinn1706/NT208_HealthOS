/**
 * Admin Security Events Page — Server Component
 *
 * Conditionally rendered based on the ADMIN_SECURITY_FEED_ENABLED feature flag.
 * When the flag is off, this route returns a 404 (not-found) response.
 *
 * Requirements: 1.5
 */

import { notFound } from "next/navigation";
import { ADMIN_SECURITY_FEED_ENABLED } from "@/lib/env";
import { SecurityPageShell } from "@/components/admin/security/security-page-shell";

export default function AdminSecurityPage() {
  if (!ADMIN_SECURITY_FEED_ENABLED) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--admin-fg)]">
          Security Events
        </h1>
        <p className="mt-1 text-sm text-[var(--admin-fg-muted)]">
          Monitor platform security events in real time.
        </p>
      </div>

      {/* Shell: KPI strip + event feed (empty until endpoint is wired) */}
      <SecurityPageShell />
    </div>
  );
}

