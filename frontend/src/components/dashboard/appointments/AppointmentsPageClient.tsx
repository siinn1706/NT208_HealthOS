"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardCheck, Plus, Stethoscope } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

import { AppointmentCreateSheet } from "@/components/dashboard/appointments/AppointmentCreateSheet";
import { AppointmentHistoryTable } from "@/components/dashboard/appointments/AppointmentHistoryTable";
import { PageHeader } from "@/components/shared/page";
import type { Appointment } from "@/types/api";

interface Props {
  appointments: Appointment[];
}

export function AppointmentsPageClient({ appointments: initial }: Props) {
  const t = useTranslations("dashboard.appointments");
  const tStatus = useTranslations("dashboard.appointments.status");
  const tVp = useTranslations("dashboard.visitPrep");
  const [appointments, setAppointments] = useState<Appointment[]>(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Review fix U3: deep-link from a routing-card "Book an appointment" CTA
  // (or any other surface) auto-opens the create sheet via `?create=1`.
  // Strips the param after opening so back-nav doesn't re-trigger the sheet.
  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpen(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("create");
      const qs = next.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCompleted = appointments.filter((a) => a.status === "completed").length;
  const totalUpcoming = appointments.filter((a) => a.status === "upcoming").length;
  const totalWithRx = appointments.filter((a) => a.hasPrescription).length;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" aria-hidden />
            {t("pageTitle")}
          </span>
        }
        description={t("pageSubtitle")}
        primaryAction={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            aria-label={t("addNewAria")}
          >
            <Plus className="w-4 h-4" />
            {t("addNew")}
          </button>
        }
      />

      <AppointmentCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(created) => setAppointments((prev) => [created, ...prev])}
      />
      <div className="max-w-[1400px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* ── Summary strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: tStatus("completed"),
            value: totalCompleted,
            color: "#4ADE80",
          },
          {
            label: tStatus("upcoming"),
            value: totalUpcoming,
            color: "#41BCE6",
          },
          {
            label: t("hasPrescription"),
            value: totalWithRx,
            color: "#E7DEA7",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card px-4 py-3 text-center"
          >
            <p
              className="text-2xl font-bold"
              style={{ color }}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Visit-prep CTA ── */}
      <Link
        href="/dashboard/visit-prep"
        className="group flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 transition-colors hover:bg-primary/10"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <ClipboardCheck className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{tVp("pageTitle")}</p>
          <p className="text-xs text-muted-foreground">{tVp("pageSubtitle")}</p>
        </div>
        <span className="text-xs font-medium text-primary">
          {tVp("list.startCta")} →
        </span>
      </Link>

      {/* ── Table ── */}
      <AppointmentHistoryTable appointments={appointments} />

      {/* ── Disclaimer ── */}
      <div className="rounded-xl border border-border bg-muted/20 px-5 py-4">
        <p className="text-xs text-muted-foreground leading-relaxed">{t("disclaimer")}</p>
      </div>
      </div>
    </>
  );
}
