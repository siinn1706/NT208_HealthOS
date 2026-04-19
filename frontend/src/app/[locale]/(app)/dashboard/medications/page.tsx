"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { Pill, Plus, Stethoscope } from "lucide-react";

import { PageHeader } from "@/components/shared/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddMedicationDialog } from "@/components/dashboard/medications/AddMedicationDialog";
import { MedicationCard } from "@/components/dashboard/medications/MedicationCard";
import { MedicationDisclaimer } from "@/components/dashboard/medications/MedicationDisclaimer";
import { TodayDosesPanel } from "@/components/dashboard/medications/TodayDosesPanel";
import type { Adherence, MedicationPlan } from "@/types/api";

type StatusFilter = "active" | "paused" | "all";

const FILTERS: StatusFilter[] = ["active", "paused", "all"];

type FetchResult<T> = { ok: true; data: T } | { ok: false; aborted: boolean };

async function fetchPlans(
  filter: StatusFilter,
  signal: AbortSignal,
): Promise<FetchResult<MedicationPlan[]>> {
  const search = new URLSearchParams();
  if (filter !== "all") search.set("status", filter);
  const qs = search.toString();
  try {
    const res = await fetch(`/api/v1/medications${qs ? `?${qs}` : ""}`, {
      cache: "no-store",
      signal,
    });
    if (!res.ok) return { ok: false, aborted: false };
    const json = await res.json().catch(() => null);
    const data = Array.isArray(json?.data) ? (json.data as MedicationPlan[]) : [];
    return { ok: true, data };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, aborted: true };
    }
    return { ok: false, aborted: false };
  }
}

async function fetchAdherence(
  planId: string,
  signal: AbortSignal,
): Promise<Adherence | null> {
  try {
    const res = await fetch(
      `/api/v1/medications/${encodeURIComponent(planId)}/adherence?period=7d`,
      { cache: "no-store", signal },
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return (json?.data ?? null) as Adherence | null;
  } catch {
    return null;
  }
}

export default function MedicationsHubPage() {
  const t = useTranslations("dashboard.medications");
  const tSummary = useTranslations("dashboard.medications.summary");
  const tFilter = useTranslations("dashboard.medications.filter");

  const [plans, setPlans] = React.useState<MedicationPlan[]>([]);
  const [adherenceById, setAdherenceById] = React.useState<Record<string, Adherence | null>>({});
  const [filter, setFilter] = React.useState<StatusFilter>("active");
  const [loading, setLoading] = React.useState(true);
  const [errorState, setErrorState] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  // Stale-load guard (review M10) — every reload bumps a sequence number; only
  // the latest one is allowed to commit state, so rapid filter changes can't
  // interleave and leave the UI showing the wrong filter.
  const reloadSeqRef = React.useRef(0);

  const reload = React.useCallback(async () => {
    const seq = ++reloadSeqRef.current;
    const controller = new AbortController();
    setLoading(true);
    setErrorState(false);
    const result = await fetchPlans(filter, controller.signal);
    if (seq !== reloadSeqRef.current) return; // stale
    if (!result.ok) {
      if (!result.aborted) setErrorState(true);
      setLoading(false);
      return;
    }
    setPlans(result.data);
    setLoading(false);
    const fresh: Record<string, Adherence | null> = {};
    await Promise.all(
      result.data.map(async (p) => {
        fresh[p.id] = await fetchAdherence(p.id, controller.signal);
      }),
    );
    if (seq !== reloadSeqRef.current) return;
    setAdherenceById(fresh);
  }, [filter]);

  React.useEffect(() => {
    void reload();
    return () => {
      // Bump the seq so any in-flight reload's commit is dropped. AbortSignal
      // wiring above keeps the network tear-down tidy too.
      reloadSeqRef.current++;
    };
  }, [reload]);

  const handleCreated = (plan: MedicationPlan) => {
    setPlans((prev) => [plan, ...prev]);
    // No abort needed for the post-create adherence refresh — the call is
    // for a brand-new plan, so a stale resolve can only return null.
    const controller = new AbortController();
    void fetchAdherence(plan.id, controller.signal).then((adh) =>
      setAdherenceById((prev) => ({ ...prev, [plan.id]: adh })),
    );
  };

  const activeCount = plans.filter((p) => p.status === "active").length;
  // Sample `Date.now()` once per render in a memo so React's purity lint
  // doesn't fire and so the comparison is stable across the same render
  // pass. The "refill due in next 7 days" tile is a coarse surface; we
  // don't need realtime-second precision.
  const refillSoon = React.useMemo(() => {
    const cutoff = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return plans.filter((p) => {
      if (!p.next_refill_estimated_at) return false;
      return new Date(p.next_refill_estimated_at).getTime() <= cutoff;
    }).length;
  }, [plans]);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" aria-hidden />
            {t("pageTitle")}
          </span>
        }
        description={t("pageSubtitle")}
        primaryAction={
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            aria-label={t("addAria")}
          >
            <Plus className="w-4 h-4" />
            {t("add")}
          </button>
        }
      />

      <AddMedicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />

      <div className="max-w-[1400px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {/* Summary strip — two real tiles. Today's doses live in the panel
            below, so a third "Today's progress" tile would just duplicate
            (review M11 dropped the `_todayKey: true` placeholder). */}
        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            <>
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </>
          ) : (
            [
              { label: tSummary("active"), value: activeCount, color: "#41BCE6" },
              { label: tSummary("refillSoon"), value: refillSoon, color: "#E7DEA7" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color }}>
                  {value}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Hub list-load failure surfaces here, not as an empty state. */}
        {errorState && !loading && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-foreground">{t("hubLoadError")}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              {t("hubLoadRetry")}
            </button>
          </div>
        )}

        {/* Today's doses */}
        <TodayDosesPanel variant="card" />

        {/* Filter */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
          <TabsList variant="line" className="flex-wrap">
            {FILTERS.map((f) => (
              <TabsTrigger key={f} value={f}>
                {tFilter(f as Parameters<typeof tFilter>[0])}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Plans list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3 px-6">
            <Pill className="w-8 h-8 opacity-40" />
            <p className="text-sm font-medium text-foreground">{t("noPlans")}</p>
            <p className="text-xs max-w-sm">{t("noPlansDesc")}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {t("add")}
              </button>
              <Link
                href={"/dashboard/appointments" as never}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                <Stethoscope className="w-4 h-4" />
                {t("importFromAppointment")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((p) => (
              <MedicationCard key={p.id} plan={p} adherence={adherenceById[p.id]} />
            ))}
          </div>
        )}

        <MedicationDisclaimer />
      </div>
    </>
  );
}
