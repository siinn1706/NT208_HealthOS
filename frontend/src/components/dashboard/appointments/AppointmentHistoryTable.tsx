"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Calendar,
  Stethoscope,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Search,
  SlidersHorizontal,
  CalendarClock,
  Activity,
  UserX,
  RefreshCw,
  CalendarPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentStatus, Prescription } from "@/types/api";
import { PrescriptionViewerDialog } from "./PrescriptionViewerDialog";

interface AppointmentHistoryTableProps {
  appointments: Appointment[];
  onSelect?: (appointment: Appointment) => void;
}

export function AppointmentHistoryTable({ appointments, onSelect }: AppointmentHistoryTableProps) {
  const t = useTranslations("dashboard.appointments");
  const tStatus = useTranslations("dashboard.appointments.status");
  const locale = useLocale();
  const [filter, setFilter] = useState<"all" | AppointmentStatus>("all");
  const [search, setSearch] = useState("");
  const [openPrescription, setOpenPrescription] = useState<
    { prescription: Prescription; appointmentId: string } | null
  >(null);

  const STATUS_CONFIG: Record<
    AppointmentStatus,
    { icon: React.ElementType; labelKey: string; color: string; bg: string }
  > = {
    booked: {
      icon: CalendarPlus,
      labelKey: "booked",
      color: "text-info",
      bg: "bg-info/10",
    },
    scheduled: {
      icon: CalendarClock,
      labelKey: "scheduled",
      color: "text-info",
      bg: "bg-info/10",
    },
    upcoming: {
      icon: Clock,
      labelKey: "upcoming",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    in_progress: {
      icon: Activity,
      labelKey: "in_progress",
      color: "text-info",
      bg: "bg-info/10",
    },
    completed: {
      icon: CheckCircle2,
      labelKey: "completed",
      color: "text-success",
      bg: "bg-success/10",
    },
    cancelled: {
      icon: XCircle,
      labelKey: "cancelled",
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
    no_show: {
      icon: UserX,
      labelKey: "no_show",
      color: "text-warning",
      bg: "bg-warning/10",
    },
    rescheduled: {
      icon: RefreshCw,
      labelKey: "rescheduled",
      color: "text-info",
      bg: "bg-info/10",
    },
  };

  const ALL_FILTERS: { key: "all" | AppointmentStatus; labelKey: string }[] = [
    { key: "all", labelKey: "filter.all" },
    { key: "upcoming", labelKey: "upcoming" },
    { key: "completed", labelKey: "completed" },
    { key: "cancelled", labelKey: "cancelled" },
    { key: "no_show", labelKey: "no_show" },
  ];

  // Filter + Search
  const filtered = appointments.filter((a) => {
    const matchStatus = filter === "all" || a.status === filter;
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      a.doctorName.toLowerCase().includes(q) ||
      a.specialty.toLowerCase().includes(q) ||
      a.clinic.toLowerCase().includes(q) ||
      a.diagnosis.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full pl-9 pr-4 h-9 rounded-lg border border-border bg-background",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
              "transition-colors"
            )}
          />
        </div>

        {/* Status filter chips */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground mr-1" aria-hidden />
          {ALL_FILTERS.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {labelKey === "filter.all"
                ? t(labelKey)
                : tStatus(labelKey as Exclude<AppointmentStatus, never>)}
            </button>
          ))}
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Stethoscope className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{t("emptyTitle")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? t("emptyRetry") : t("emptyList")}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((appt) => {
              const cfg = STATUS_CONFIG[appt.status];
              const StatusIcon = cfg.icon;
              const date = new Date(appt.date);
              const isValidDate = !Number.isNaN(date.getTime());
              const dateStr = isValidDate
                ? date.toLocaleDateString(locale, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "--";
              const timeStr = isValidDate
                ? date.toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "--";

              return (
                <li
                  key={appt.id}
                  onClick={() => onSelect?.(appt)}
                  className={cn(
                    "px-5 py-4 flex items-start gap-4",
                    (appt.status === "cancelled" || appt.status === "no_show") && "opacity-60",
                    onSelect && "cursor-pointer hover:bg-muted/30 transition-colors",
                  )}
                >
                  {/* Date column */}
                  <div className="flex-shrink-0 w-12 text-center hidden sm:block">
                    <p className="text-lg font-bold text-foreground leading-none">
                      {isValidDate ? date.getDate().toString().padStart(2, "0") : "--"}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
                      {isValidDate
                        ? `${date.toLocaleString(locale, { month: "short" })} ${date.getFullYear()}`
                        : "N/A"}
                    </p>
                  </div>

                  {/* Vertical divider */}
                  <div className="hidden sm:block w-px self-stretch bg-border" />

                  {/* Contents */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {appt.doctorName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {appt.specialty} · {appt.clinic}
                        </p>
                      </div>
                      {/* Status badge */}
                      <span
                        className={cn(
                          "flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                          cfg.bg,
                          cfg.color
                        )}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {tStatus(cfg.labelKey)}
                      </span>
                    </div>

                    {/* Diagnosis */}
                    <p className="text-xs text-foreground/80 leading-snug">{appt.diagnosis}</p>

                    {/* Meta footer */}
                    <div className="flex items-center gap-3 pt-0.5">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {dateStr} · {timeStr}
                      </span>
                      {appt.notes && (
                        <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {appt.notes}
                        </span>
                      )}
                      {appt.hasPrescription && appt.prescription && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            appt.prescription &&
                              setOpenPrescription({
                                prescription: appt.prescription,
                                appointmentId: appt.id,
                              });
                          }}
                          className={cn(
                            "ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5",
                            "text-[11px] font-medium text-primary bg-primary/10",
                            "hover:bg-primary/20 transition-colors cursor-pointer"
                          )}
                          aria-label={t("prescriptionAria", { name: appt.doctorName })}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {t("viewPrescription")}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Prescription dialog */}
      {openPrescription && (
        <PrescriptionViewerDialog
          prescription={openPrescription.prescription}
          appointmentId={openPrescription.appointmentId}
          onClose={() => setOpenPrescription(null)}
        />
      )}
    </>
  );
}
