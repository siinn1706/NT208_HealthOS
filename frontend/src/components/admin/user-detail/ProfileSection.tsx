"use client";

/**
 * ProfileSection.tsx
 *
 * Read-only profile summary for admin user detail.
 * Groups: Identity | Account | Timeline
 * NO PHI: no vitals, diagnoses, or medical_record fields rendered. (R8.7)
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserSubscription {
  plan_code: string;
  status: string;
  expires_at?: string;
  admin_note?: string;
}

export interface UserDetail {
  user_id: string;
  display_name: string | null;
  email: string;
  status: "active" | "banned" | "deleted" | string;
  role: string | null;
  roles: string[];
  permissions: string[];
  subscription: UserSubscription | null;
  created_at: string;
  last_seen_at: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncate(value: string | null | undefined, maxLen: number): string {
  if (!value) return "—";
  return value.length > maxLen ? value.slice(0, maxLen) + "…" : value;
}

function formatIso(value: string | null | undefined): string {
  if (!value) return "—";
  return value;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default";
    case "banned": return "destructive";
    case "deleted": return "outline";
    default: return "secondary";
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

function FieldRow({ label, children, className }: FieldRowProps) {
  return (
    <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4", className)}>
      <dt className="w-36 shrink-0 text-sm font-medium text-[var(--admin-fg-muted)]">{label}</dt>
      <dd className="text-sm text-[var(--admin-fg)]">{children}</dd>
    </div>
  );
}

interface GroupProps {
  id: string;
  heading: string;
  children: React.ReactNode;
}

function Group({ id, heading, children }: GroupProps) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h3 id={id} className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
        {heading}
      </h3>
      <dl className="space-y-3">{children}</dl>
    </section>
  );
}

// ── ProfileSection ───────────────────────────────────────────────────────────

export interface ProfileSectionProps {
  user: UserDetail;
  className?: string;
}

export function ProfileSection({ user, className }: ProfileSectionProps) {
  const t = useTranslations("admin.userDetail.profile");
  const displayName = truncate(user.display_name, 100);
  const email = truncate(user.email, 254);

  return (
    <section
      aria-labelledby="profile-section-heading"
      className={cn(
        "rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6",
        className,
      )}
    >
      <h2
        id="profile-section-heading"
        className="mb-6 text-base font-semibold tracking-tight text-[var(--admin-fg)]"
      >
        {t("heading")}
      </h2>

      <div className="space-y-6">
        {/* ── Identity ──────────────────────────────────────────────── */}
        <Group id="group-identity" heading="Identity">
          <FieldRow label={t("displayName")}>
            <span className="font-medium text-[var(--admin-fg)]">
              {user.display_name ? displayName : <span className="italic text-[var(--admin-fg-muted)]">{t("noName")}</span>}
            </span>
          </FieldRow>
          <FieldRow label={t("email")}>
            <span className="break-all text-[var(--admin-fg)]">{email}</span>
          </FieldRow>
          <FieldRow label={t("userId")}>
            <span className="admin-tabular text-xs text-[var(--admin-fg-muted)]">{user.user_id}</span>
          </FieldRow>
        </Group>

        <hr className="border-[var(--admin-divider)]" />

        {/* ── Account ───────────────────────────────────────────────── */}
        <Group id="group-account" heading="Account">
          <FieldRow label={t("status")}>
            <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
          </FieldRow>
          <FieldRow label={t("roles")}>
            {user.roles && user.roles.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {user.roles.map((role) => (
                  <Badge key={role} variant="secondary">{role}</Badge>
                ))}
              </div>
            ) : (
              <span className="text-[var(--admin-fg-muted)]">{t("noRoles")}</span>
            )}
          </FieldRow>
        </Group>

        <hr className="border-[var(--admin-divider)]" />

        {/* ── Timeline ──────────────────────────────────────────────── */}
        <Group id="group-timeline" heading="Timeline">
          <FieldRow label={t("createdAt")}>
            <time dateTime={user.created_at} className="admin-tabular text-[var(--admin-fg)]">
              {formatIso(user.created_at)}
            </time>
          </FieldRow>
          <FieldRow label={t("lastSeen")}>
            {user.last_seen_at ? (
              <time dateTime={user.last_seen_at} className="admin-tabular text-[var(--admin-fg)]">
                {formatIso(user.last_seen_at)}
              </time>
            ) : (
              <span className="text-[var(--admin-fg-muted)]">N/A</span>
            )}
          </FieldRow>
        </Group>
      </div>
    </section>
  );
}
