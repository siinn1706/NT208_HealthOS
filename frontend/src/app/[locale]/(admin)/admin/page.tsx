"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/bff-admin-client";
import { debounce, retryGate } from "@/lib/admin/async-control";
import { OverviewCards, type OverviewData } from "@/components/admin/overview/OverviewCards";
import { ActivityFeed } from "@/components/admin/overview/ActivityFeed";
import { SignupsTrendChart } from "@/components/admin/overview/SignupsTrendChart";
import { PlanDistributionDonut } from "@/components/admin/overview/PlanDistributionDonut";
import { AdminErrorState } from "@/components/admin/shared/AdminErrorState";
import { AdminPageContent } from "@/components/admin/shared/admin-page-content";
import { AdminPageHeader } from "@/components/admin/shared/admin-page-header";
import { AdminCard } from "@/components/admin/shared/admin-card";

interface OverviewResponse {
  data: OverviewData;
}

type FetchState =
  | { status: "loading" }
  | { status: "success"; data: OverviewData }
  | { status: "error"; reason: string };

const MAX_RETRIES = 3;

export default function AdminOverviewPage() {
  const [state, setState] = React.useState<FetchState>({ status: "loading" });
  const [inFlight, setInFlight] = React.useState(false);
  const gate = React.useRef(retryGate(MAX_RETRIES));
  const [retriesLeft, setRetriesLeft] = React.useState(MAX_RETRIES);

  const fetchOverview = React.useCallback(async () => {
    setInFlight(true);
    setState({ status: "loading" });
    try {
      const res = await adminFetch<OverviewResponse>("/api/v1/admin/overview", { timeoutMs: 10_000 });
      gate.current.reset();
      setRetriesLeft(MAX_RETRIES);
      setState({ status: "success", data: res.data });
    } catch (err) {
      gate.current.recordAttempt();
      setRetriesLeft((prev) => Math.max(0, prev - 1));
      setState({ status: "error", reason: err instanceof Error ? err.message : "An unexpected error occurred." });
    } finally {
      setInFlight(false);
    }
  }, []);

  const debouncedFetch = React.useRef(debounce(fetchOverview, 500));
  React.useEffect(() => { debouncedFetch.current = debounce(fetchOverview, 500); }, [fetchOverview]);
  React.useEffect(() => { void fetchOverview(); }, [fetchOverview]);

  const handleRetry = React.useCallback(() => {
    if (!gate.current.canRetry()) return;
    void fetchOverview();
  }, [fetchOverview]);

  const handleRefresh = React.useCallback(() => {
    if (inFlight) return;
    void debouncedFetch.current();
  }, [inFlight]);

  const overviewData = state.status === "success" ? state.data : null;
  const isLoading = state.status === "loading";

  // Derive plan distribution slices from overview data if available
  const planSlices = overviewData?.recommended_plan
    ? null // no per-plan counts in this shape — slot remains empty until BFF grows
    : null;

  return (
    <AdminPageContent>
      {/* Page header */}
      <AdminPageHeader title="Overview">
        {/* Time-range control — visual-only until BFF supports it */}
        <div
          role="group"
          aria-label="Time range"
          className="flex items-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-muted)]"
        >
          {(["7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              type="button"
              aria-disabled="true"
              title="Backend support coming soon"
              className="px-3 py-1.5 text-xs font-medium text-[var(--admin-fg-muted)] first:rounded-l-md last:rounded-r-md opacity-60 cursor-not-allowed"
            >
              {range}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={inFlight}
          aria-label="Refresh overview data"
          aria-busy={inFlight}
          className="motion-safe:transition-colors motion-safe:duration-150"
        >
          <RefreshCw className={`size-3.5 ${inFlight ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </Button>
      </AdminPageHeader>

      {/* Error state */}
      {state.status === "error" && (
        <AdminErrorState reason={state.reason} onRetry={handleRetry} retriesLeft={retriesLeft} />
      )}

      {/* KPI cards row */}
      <OverviewCards data={overviewData} isLoading={isLoading} />

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <AdminCard className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-[var(--admin-fg)]">Signups Trend (30d)</h2>
          <SignupsTrendChart
            data={null}
            isLoading={isLoading}
          />
        </AdminCard>
        <AdminCard>
          <h2 className="mb-3 text-sm font-semibold text-[var(--admin-fg)]">Plan Distribution</h2>
          <PlanDistributionDonut
            data={planSlices}
            isLoading={isLoading}
          />
        </AdminCard>
      </div>

      {/* Activity feed */}
      {(state.status === "success" || isLoading) && (
        <ActivityFeed
          events={overviewData?.recent_events}
          isLoading={isLoading}
        />
      )}
    </AdminPageContent>
  );
}
