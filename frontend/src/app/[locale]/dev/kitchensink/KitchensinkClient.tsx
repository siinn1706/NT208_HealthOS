"use client";

import * as React from "react";
import {
  Banner,
  EmptyState,
  InlineNotice,
  StaleDataIndicator,
  StateCard,
  StateView,
  OfflineIndicator,
} from "@/components/shared/state";
import { PageHeader, PageTabs, Stepper } from "@/components/shared/page";
import {
  AuthBanner,
  AuthShell,
  OtpField,
  PasswordField,
  PendingButton,
} from "@/components/shared/auth/primitives";
import { Button } from "@/components/ui/button";
import { ConfidenceChip } from "@/components/ui/confidence-chip";
import { FreshnessChip } from "@/components/ui/freshness-chip";
import { SourceBadge } from "@/components/ui/source-badge";
import { DataState } from "@/components/ui/data-state";
import { dataSlice } from "@/types/data-slice";
import { PermissionBanner } from "@/components/ui/permission-banner";
import { AtmosphereGlow } from "@/components/shared/AtmosphereGlow";
import { AtmosphereGrid } from "@/components/shared/AtmosphereGrid";

/**
 * Section wrapper used by every primitive demo. Keeps spacing and headings
 * consistent so the page reads top-to-bottom like a styleguide.
 */
function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3 border-b border-border pb-8">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function KitchensinkClient() {
  const [otp, setOtp] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [tab, setTab] = React.useState<string>("overview");

  const sections: Array<{ id: string; label: string }> = [
    { id: "page", label: "Page" },
    { id: "state", label: "State" },
    { id: "empty", label: "Empty" },
    { id: "auth", label: "Auth" },
    { id: "stepper", label: "Stepper" },
    { id: "tabs", label: "Tabs" },
    { id: "chips", label: "Chips" },
    { id: "data-state", label: "DataState" },
    { id: "atmosphere", label: "Atmosphere" },
    { id: "permission", label: "Permission" },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border bg-muted/30 px-6 py-4">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Dev only
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            HealthOS · Kitchensink
          </h1>
          <p className="text-sm text-muted-foreground">
            Visual reference for every shared primitive. Not linked from the app
            shell. 404s in production builds.
          </p>
          <nav
            aria-label="Sections"
            className="mt-3 flex flex-wrap gap-2 text-xs"
          >
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-border bg-background px-3 py-1 text-muted-foreground transition-colors hover:bg-muted"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-6 py-10">
        <Section
          id="page"
          title="PageHeader"
          description="Sticky page header used on every dashboard route."
        >
          <PageHeader
            title="Reports"
            description="Daily, weekly and monthly summaries of your activity."
            primaryAction={
              <Button size="sm" type="button">
                Export CSV
              </Button>
            }
            secondaryActions={
              <Button size="sm" variant="outline" type="button">
                Filters
              </Button>
            }
            meta={
              <StaleDataIndicator updatedAt={new Date(Date.now() - 6 * 60_000)} />
            }
          />
        </Section>

        <Section
          id="state"
          title="Banner / InlineNotice / StateCard / StateView"
          description="Inline surfaces for transient and recoverable states."
        >
          <Banner variant="info" title="Heads up">
            We&apos;re currently running on a degraded provider; some risk
            calculations may be slightly delayed.
          </Banner>
          <Banner variant="warning" title="Subscription ends in 3 days">
            Renew now to keep continuous monitoring active.
          </Banner>
          <Banner variant="success" title="Reminder created" />
          <Banner variant="destructive" title="Could not save changes">
            Please retry — your edits are kept locally.
          </Banner>

          <div className="grid gap-3 md:grid-cols-2">
            <InlineNotice variant="info">Saving draft…</InlineNotice>
            <InlineNotice variant="success">Draft saved 2s ago</InlineNotice>
            <InlineNotice variant="warning">
              We&apos;re offline. Changes will sync when you&apos;re back online.
            </InlineNotice>
            <InlineNotice variant="destructive">
              Could not reach server. Check your connection.
            </InlineNotice>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <StateCard
              cardTitle="Latest reports"
              cardSubtitle="Last 30 days"
              kind="empty-first-use"
              emptyTitle="No reports yet"
              emptyDescription="Your first report will appear here once you log a few days of data."
              primaryAction={{
                label: "Log activity",
                href: "/dashboard/health",
                variant: "default",
              }}
            />
            <StateCard
              cardTitle="Sync"
              cardSubtitle="Background job"
              kind="error"
              emptyTitle="Couldn't reach the server"
              emptyDescription="Network looks unstable."
              primaryAction={{ label: "Retry", onClick: () => undefined }}
              secondaryAction={{ label: "Reload page", onClick: () => undefined }}
            />
          </div>

          <StateView
            kind="error"
            density="route"
            title="Something went wrong"
            description="An unexpected error occurred while loading this page."
            primaryAction={{ label: "Try again", onClick: () => undefined }}
            secondaryAction={{ label: "Go home", href: "/" }}
          />
        </Section>

        <Section
          id="empty"
          title="EmptyState"
          description="First-use, no-results, and no-data-in-range surfaces."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <EmptyState
              kind="empty-first-use"
              title="No meals yet"
              description="Log your first meal to start tracking."
              primaryAction={{
                label: "Log meal",
                href: "/dashboard/meals/add",
              }}
            />
            <EmptyState
              kind="empty-no-results"
              title="No matches"
              description="Try a different search term."
            />
            <EmptyState
              kind="empty-no-data-in-range"
              title="No data in this range"
              description="Adjust the date range to see results."
            />
          </div>
        </Section>

        <Section
          id="auth"
          title="Auth primitives"
          description="AuthShell wraps the form; AuthBanner / PasswordField / OtpField / PendingButton compose inside."
        >
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <AuthShell
              title="Sign in"
              subtitle="Welcome back to HealthOS."
              banner={
                <AuthBanner variant="info" title="Tip">
                  Use a unique password for your healthcare account.
                </AuthBanner>
              }
              footer={
                <p className="text-xs text-muted-foreground">
                  Secured with end-to-end encryption.
                </p>
              }
            >
              <PasswordField
                id="ks-password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={
                  password.length > 0 && password.length < 8
                    ? "Use at least 8 characters."
                    : null
                }
              />
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  One-time code
                </p>
                <OtpField
                  id="ks-otp"
                  length={6}
                  value={otp}
                  onChange={setOtp}
                />
              </div>
              <PendingButton
                pending={pending}
                onClick={() => {
                  setPending(true);
                  window.setTimeout(() => setPending(false), 1200);
                }}
                pendingLabel="Signing in…"
              >
                Sign in
              </PendingButton>
            </AuthShell>
          </div>
        </Section>

        <Section
          id="stepper"
          title="Stepper"
          description="Used by onboarding wizard. Optional steps render with a discreet hint."
        >
          <Stepper
            steps={[
              { id: "basics", label: "Basics" },
              { id: "health", label: "Health" },
              { id: "contact", label: "Contact" },
              { id: "emergency", label: "Emergency" },
              { id: "medical", label: "Medical", optional: true },
            ]}
            activeIndex={2}
            navigableIndexes={[0, 1, 2]}
            onStepClick={() => undefined}
            ariaLabel="Onboarding"
          />
        </Section>

        <Section
          id="tabs"
          title="PageTabs"
          description="Used for category filters within a page (e.g. reports)."
        >
          <PageTabs
            activeKey={tab}
            onChange={setTab}
            items={[
              { key: "overview", label: "Overview" },
              { key: "trends", label: "Trends", count: 12 },
              { key: "insights", label: "Insights" },
            ]}
            ariaLabel="Reports sections"
          />
          <div className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            Active tab: <span className="font-mono">{tab}</span>
          </div>
        </Section>

        {/* ── CHIPS ──────────────────────────────────────────────── */}
        <Section
          id="chips"
          title="ConfidenceChip · FreshnessChip · SourceBadge"
          description="Inline trust-cue chips used wherever AI output, data freshness, or data provenance needs surface-level explanation."
        >
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ConfidenceChip</p>
            <div className="flex flex-wrap gap-2">
              <ConfidenceChip tier="high" />
              <ConfidenceChip tier="high" value={0.92} showValue />
              <ConfidenceChip tier="medium" />
              <ConfidenceChip tier="medium" value={0.71} showValue />
              <ConfidenceChip tier="low" />
              <ConfidenceChip tier="low" value={0.45} showValue />
              <ConfidenceChip tier="unknown" />
              <ConfidenceChip value={0.85} />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">FreshnessChip</p>
            <div className="flex flex-wrap gap-2">
              <FreshnessChip tier="live" />
              <FreshnessChip tier="recent" />
              <FreshnessChip tier="stale" />
              <FreshnessChip tier="very_stale" />
              <FreshnessChip tier="no_data" />
              <FreshnessChip tier="stale" variant="expanded" recordedAt={new Date(Date.now() - 3 * 3600_000).toISOString()} />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SourceBadge</p>
            <div className="flex flex-wrap gap-2">
              <SourceBadge provider="apple_health" />
              <SourceBadge provider="google_fit" />
              <SourceBadge provider="fitbit" />
              <SourceBadge provider="garmin" />
              <SourceBadge provider="withings" />
              <SourceBadge provider="samsung_health" />
              <SourceBadge provider="manual" />
              <SourceBadge provider="apple_health" variant="icon" />
              <SourceBadge provider="apple_health" variant="text" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">OfflineIndicator</p>
            <div className="flex flex-wrap gap-2">
              <OfflineIndicator />
              {/* Force render for preview via className — normally hidden when online */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-100">
                <span className="size-3 animate-spin inline-block border-2 border-current border-t-transparent rounded-full" />
                Reconnecting…
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-100">
                Offline
              </span>
            </div>
          </div>
        </Section>

        {/* ── DATA STATE ─────────────────────────────────────────── */}
        <Section
          id="data-state"
          title="DataState"
          description="Routes rendering to the correct UI for every DataSlice status. Pass children for the happy path; each non-success status renders a built-in default."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">loading</p>
              <DataState slice={dataSlice.loading()}>
                {() => null}
              </DataState>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">pending</p>
              <DataState slice={dataSlice.pending()}>
                {() => null}
              </DataState>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">empty</p>
              <DataState slice={dataSlice.empty()}>
                {() => null}
              </DataState>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">empty_in_range</p>
              <DataState slice={dataSlice.emptyInRange()}>
                {() => null}
              </DataState>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">recoverable_error</p>
              <DataState
                slice={dataSlice.recoverableError({ code: "NET_ERR", message: "Network problem." })}
                onRetry={() => undefined}
              >
                {() => null}
              </DataState>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">hard_error</p>
              <DataState
                slice={dataSlice.hardError({ code: "SRV_500", message: "Unexpected server error." })}
              >
                {() => null}
              </DataState>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">no_permission</p>
              <DataState slice={dataSlice.noPermission()}>
                {() => null}
              </DataState>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">success</p>
              <DataState slice={dataSlice.success("All good")}>
                {(data) => (
                  <p className="rounded-xl border border-border/50 bg-card/30 p-4 text-sm text-foreground">
                    {data}
                  </p>
                )}
              </DataState>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">degraded</p>
              <DataState slice={dataSlice.degraded("Partial AI result", { confidence: 0.42 })}>
                {(data) => (
                  <p className="rounded-xl border border-border/50 bg-card/30 p-4 text-sm text-foreground">
                    {data}
                  </p>
                )}
              </DataState>
            </div>
          </div>
        </Section>

        {/* ── ATMOSPHERE ─────────────────────────────────────────── */}
        <Section
          id="atmosphere"
          title="AtmosphereGlow · AtmosphereGrid"
          description='Decorative ambient layers for hero sections. AtmosphereGlow renders a radial bloom; AtmosphereGrid overlays a subtle 48px line grid (default) or a 24px dotted grid (variant="dots").'
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">AtmosphereGlow — default (dark section)</p>
              <div className="relative h-32 overflow-hidden rounded-xl bg-gradient-to-br from-night-900 via-night-800 to-night-900">
                <AtmosphereGlow />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">AtmosphereGlow — soft variant</p>
              <div className="relative h-32 overflow-hidden rounded-xl bg-gradient-to-br from-night-900 via-night-800 to-night-900">
                <AtmosphereGlow variant="soft" static />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">AtmosphereGrid — dark surface</p>
              <div className="relative h-32 overflow-hidden rounded-xl bg-gradient-to-br from-night-900 via-night-800 to-night-900">
                <AtmosphereGrid />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">AtmosphereGrid — light surface</p>
              <div className="relative h-32 overflow-hidden rounded-xl bg-card border border-border">
                <AtmosphereGrid />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">AtmosphereGrid — dots, dark surface</p>
              <div className="relative h-32 overflow-hidden rounded-xl bg-gradient-to-br from-night-900 via-night-800 to-night-900">
                <AtmosphereGrid variant="dots" tone="dark" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">AtmosphereGrid — dots, light surface</p>
              <div className="relative h-32 overflow-hidden rounded-xl border border-border bg-card">
                <AtmosphereGrid variant="dots" tone="light" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── PERMISSION BANNER ──────────────────────────────────── */}
        <Section
          id="permission"
          title="PermissionBanner"
          description="Top-of-section banner explaining why a browser permission is needed. Supports notifications, camera, and storage kinds."
        >
          <div className="space-y-3">
            <PermissionBanner kind="notifications" visible onDismiss={() => undefined} />
            <PermissionBanner kind="camera" visible onDismiss={() => undefined} />
            <PermissionBanner kind="storage" visible />
          </div>
        </Section>
      </main>
    </div>
  );
}
