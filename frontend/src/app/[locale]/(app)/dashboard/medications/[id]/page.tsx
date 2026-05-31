"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/navigation";
import {
  Archive,
  ArrowLeft,
  Clock,
  Loader2,
  Pause,
  Pencil,
  Pill,
  Play,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdherencePeriodTabs, type AdherencePeriod } from "@/components/dashboard/medications/AdherencePeriodTabs";
import { AdherenceRing } from "@/components/dashboard/medications/AdherenceRing";
import { EditMedicationDrawer } from "@/components/dashboard/medications/EditMedicationDrawer";
import { MedicationDisclaimer } from "@/components/dashboard/medications/MedicationDisclaimer";
import { RefillBanner } from "@/components/dashboard/medications/RefillBanner";
import { cn } from "@/lib/utils";
import type { Adherence, MedicationPlanDetail } from "@/types/api";

async function fetchDetail(id: string): Promise<MedicationPlanDetail | null> {
  const res = await fetch(`/api/v1/medications/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return (json?.data ?? null) as MedicationPlanDetail | null;
}

async function fetchAdherence(id: string, period: AdherencePeriod): Promise<Adherence | null> {
  const res = await fetch(
    `/api/v1/medications/${encodeURIComponent(id)}/adherence?period=${period}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return (json?.data ?? null) as Adherence | null;
}

export default function MedicationDetailPage() {
  const t = useTranslations("dashboard.medications");
  const tDetail = useTranslations("dashboard.medications.detail");
  const tAdh = useTranslations("dashboard.medications.detail.adherence");
  const tCard = useTranslations("dashboard.medications.card");
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [plan, setPlan] = React.useState<MedicationPlanDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [period, setPeriod] = React.useState<AdherencePeriod>("7d");
  const [adherence, setAdherence] = React.useState<Adherence | null>(null);
  const [adhLoading, setAdhLoading] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [actionBusy, setActionBusy] = React.useState<"pause" | "resume" | "archive" | null>(null);

  const reload = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    const d = await fetchDetail(id);
    if (!d) {
      setErrorMsg(tDetail("loadError"));
      setLoading(false);
      return;
    }
    setPlan(d);
    setLoading(false);
  }, [id, tDetail]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setAdhLoading(true);
    fetchAdherence(id, period).then((a) => {
      if (cancelled) return;
      setAdherence(a);
      setAdhLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, period]);

  const handlePause = async () => {
    if (!plan) return;
    setActionBusy("pause");
    try {
      const res = await fetch(`/api/v1/medications/${encodeURIComponent(plan.id)}/pause`, {
        method: "POST",
      });
      if (!res.ok) toast.error(tDetail("actions.pauseError"));
      else await reload();
    } finally {
      setActionBusy(null);
    }
  };

  const handleResume = async () => {
    if (!plan) return;
    setActionBusy("resume");
    try {
      const res = await fetch(`/api/v1/medications/${encodeURIComponent(plan.id)}/resume`, {
        method: "POST",
      });
      if (!res.ok) toast.error(tDetail("actions.resumeError"));
      else await reload();
    } finally {
      setActionBusy(null);
    }
  };

  const handleArchive = async () => {
    if (!plan) return;
    setActionBusy("archive");
    setArchiveOpen(false);
    try {
      const res = await fetch(`/api/v1/medications/${encodeURIComponent(plan.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error(tDetail("actions.archiveError"));
      } else {
        router.push("/dashboard/medications");
      }
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-5 sm:px-6 lg:px-8 space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (errorMsg || !plan) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-10 sm:px-6 lg:px-8 text-center text-muted-foreground">
        <p className="text-sm">{errorMsg ?? tDetail("loadError")}</p>
        <Link
          href={"/dashboard/medications" as never}
          className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> {t("pageTitle")}
        </Link>
      </div>
    );
  }

  const showRefill =
    plan.refill_supply_units !== null || plan.next_refill_estimated_at !== null;

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Link
            href={"/dashboard/medications" as never}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> {t("pageTitle")}
          </Link>
        }
        title={
          <span className="flex items-center gap-2">
            <Pill className="size-5 text-primary" aria-hidden />
            {plan.name}
            {plan.strength && (
              <span className="text-sm font-normal text-muted-foreground">
                {plan.strength}
              </span>
            )}
            {plan.status !== "active" && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-border">
                {plan.status === "paused" && tCard("paused")}
                {plan.status === "completed" && tCard("completed")}
                {plan.status === "cancelled" && tCard("cancelled")}
              </span>
            )}
          </span>
        }
        description={plan.instructions ?? undefined}
        primaryAction={
          plan.status === "active" ? (
            <Button
              type="button"
              variant="outline"
              onClick={handlePause}
              disabled={actionBusy !== null}
              className="gap-2"
            >
              {actionBusy === "pause" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Pause className="size-4" />
              )}
              {tDetail("pause")}
            </Button>
          ) : plan.status === "paused" ? (
            <Button
              type="button"
              onClick={handleResume}
              disabled={actionBusy !== null}
              className="gap-2"
            >
              {actionBusy === "resume" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {tDetail("resume")}
            </Button>
          ) : null
        }
        secondaryActions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(true)}
              className="gap-2"
            >
              <Pencil className="size-3.5" />
              {tDetail("edit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setArchiveOpen(true)}
              className="gap-2 text-destructive hover:text-destructive"
              disabled={plan.status === "cancelled"}
            >
              <Archive className="size-3.5" />
              {tDetail("archive")}
            </Button>
          </>
        }
      />

      <div className="max-w-[900px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {showRefill && <RefillBanner plan={plan} onRefilled={() => void reload()} />}

        {/* Adherence */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{tAdh("title")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tAdh(`period.${period}` as Parameters<typeof tAdh>[0])}
              </p>
            </div>
            <AdherencePeriodTabs
              value={period}
              onChange={setPeriod}
              labels={{
                "7d": tAdh("period.7d"),
                "30d": tAdh("period.30d"),
                "90d": tAdh("period.90d"),
              }}
            />
          </div>
          <div className="flex items-center gap-5 flex-wrap">
            <AdherenceRing adherence={adherence} size={96} stroke={8} />
            {adhLoading ? (
              <div className="flex-1 space-y-2 min-w-[200px]">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : adherence && adherence.scheduled > 0 ? (
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 flex-1 min-w-[240px]">
                <Stat label={tAdh("scheduled")} value={adherence.scheduled} />
                <Stat label={tAdh("taken")} value={adherence.taken} color="#10b981" />
                <Stat label={tAdh("missed")} value={adherence.missed} color="#ef4444" />
                <Stat label={tAdh("skipped")} value={adherence.skipped} />
              </dl>
            ) : (
              <p className="text-xs text-muted-foreground">{tAdh("empty")}</p>
            )}
          </div>
        </section>

        {/* Schedule */}
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground mb-3">{tDetail("schedule")}</p>
          {plan.doses.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("noPlans")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {plan.doses.map((d) => {
                const next = d.next_occurrence_at
                  ? new Date(d.next_occurrence_at).toLocaleString(locale, {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";
                return (
                  <li
                    key={d.reminder_id}
                    className={cn(
                      "flex items-center justify-between py-3 text-sm",
                      !d.is_active && "opacity-60",
                    )}
                  >
                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                      <Clock className="size-3.5 text-muted-foreground" aria-hidden />
                      {d.time}
                    </span>
                    <span className="text-xs text-muted-foreground">{next}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Linked appointment */}
        {plan.appointment_id && (
          <section className="rounded-xl border border-border bg-card p-5 flex items-center gap-3">
            <Stethoscope className="size-5 text-primary flex-shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {tDetail("linkedAppointment")}
              </p>
              {plan.prescriber && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tDetail("prescriber")}: {plan.prescriber}
                  {plan.clinic && (
                    <span> · {tDetail("clinic")}: {plan.clinic}</span>
                  )}
                </p>
              )}
            </div>
            <Link
              href={"/dashboard/appointments" as never}
              className="text-xs text-primary hover:underline"
            >
              {tDetail("openAppointment")} →
            </Link>
          </section>
        )}

        <MedicationDisclaimer />
      </div>

      <EditMedicationDrawer
        key={`${plan.id}:${editOpen ? "open" : "closed"}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        plan={plan}
        onSaved={reload}
      />

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tDetail("archiveConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tDetail("archiveConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tDetail("archiveCancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleArchive}
              disabled={actionBusy !== null}
            >
              {actionBusy === "archive" && (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              )}
              {tDetail("archiveConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-lg font-semibold mt-0.5" style={{ color }}>
        {value}
      </dd>
    </div>
  );
}
