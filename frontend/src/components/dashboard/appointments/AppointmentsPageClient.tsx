"use client";

import { Stethoscope, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppointmentHistoryTable } from "@/components/dashboard/appointments/AppointmentHistoryTable";
import type { Appointment } from "@/types/api";

interface Props {
  appointments: Appointment[];
}

export function AppointmentsPageClient({ appointments }: Props) {
  const t = useTranslations("dashboard.appointments");
  const tStatus = useTranslations("dashboard.appointments.status");

  const totalCompleted = appointments.filter((a) => a.status === "completed").length;
  const totalUpcoming = appointments.filter((a) => a.status === "upcoming").length;
  const totalWithRx = appointments.filter((a) => a.hasPrescription).length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" aria-hidden />
            <h1 className="text-xl font-bold text-foreground">{t("pageTitle")}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("pageSubtitle")}
          </p>
        </div>

        {/* Add appointment button (BFF TODO: POST /api/v1/appointments) */}
        <button
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          aria-label={t("addNewAria")}
        >
          <Plus className="w-4 h-4" />
          {t("addNew")}
        </button>
      </div>

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

      {/* ── Table ── */}
      <AppointmentHistoryTable appointments={appointments} />

      {/* ── Disclaimer ── */}
      <div className="rounded-xl border border-border bg-muted/20 px-5 py-4">
        <p className="text-xs text-muted-foreground leading-relaxed">{t("disclaimer")}</p>
      </div>
    </div>
  );
}
