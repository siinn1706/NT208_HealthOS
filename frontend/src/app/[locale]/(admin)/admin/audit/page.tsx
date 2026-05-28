/**
 * Admin Audit Log Page — Server Component
 *
 * Conditionally rendered based on the ADMIN_AUDIT_FEED_ENABLED feature flag.
 * When the flag is off, this route returns a 404 (not-found) response.
 *
 * Requirements: 1.5
 */

import { notFound } from "next/navigation";
import { ADMIN_AUDIT_FEED_ENABLED } from "@/lib/env";
import { AuditPageShell } from "@/components/admin/audit/audit-page-shell";

export default function AdminAuditPage() {
  if (!ADMIN_AUDIT_FEED_ENABLED) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--admin-fg)]">
          Audit Log
        </h1>
        <p className="mt-1 text-sm text-[var(--admin-fg-muted)]">
          Review a chronological log of administrative actions.
        </p>
      </div>

      {/* Client shell: filter state + table (empty until endpoint is wired) */}
      <AuditPageShell />
    </div>
  );
}

