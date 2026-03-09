"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/data/appointments";
import { MOCK_PRESCRIPTIONS } from "@/data/appointments";
import { PrescriptionViewerDialog } from "./PrescriptionViewerDialog";

// BFF TODO: GET /api/v1/appointments
// Trigger: page load; Request: { page: number; limit: number }
// Response: { data: Appointment[]; meta: { total; page; per_page } }
// Fallback: use MOCK_APPOINTMENTS from @/data/appointments

interface AppointmentHistoryTableProps {
  appointments: Appointment[];
}

const STATUS_CONFIG: Record<AppointmentStatus, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  completed: {
    icon: CheckCircle2,
    label: "Đã khám",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  upcoming: {
    icon: Clock,
    label: "Sắp tới",
    color: "text-[#41BCE6]",
    bg: "bg-[#41BCE6]/10",
  },
  cancelled: {
    icon: XCircle,
    label: "Đã hủy",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
};

const ALL_FILTERS: { key: "all" | AppointmentStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "upcoming", label: "Sắp tới" },
  { key: "completed", label: "Đã khám" },
  { key: "cancelled", label: "Đã hủy" },
];

export function AppointmentHistoryTable({ appointments }: AppointmentHistoryTableProps) {
  const [filter, setFilter] = useState<"all" | AppointmentStatus>("all");
  const [search, setSearch] = useState("");
  const [openPrescriptionId, setOpenPrescriptionId] = useState<string | null>(null);

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

  const prescription = openPrescriptionId
    ? MOCK_PRESCRIPTIONS[openPrescriptionId] ?? null
    : null;

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Tìm kiếm bác sĩ, chẩn đoán..."
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
          {ALL_FILTERS.map(({ key, label }) => (
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
              {label}
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
            <p className="text-sm font-medium text-foreground">Không tìm thấy lịch khám</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? "Thử lại với từ khóa khác" : "Chưa có lịch sử khám nào"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((appt) => {
              const cfg = STATUS_CONFIG[appt.status];
              const StatusIcon = cfg.icon;
              const date = new Date(appt.date);
              const dateStr = date.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
              const timeStr = date.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <li
                  key={appt.id}
                  className={cn(
                    "px-5 py-4 flex items-start gap-4",
                    appt.status === "cancelled" && "opacity-60"
                  )}
                >
                  {/* Date column */}
                  <div className="flex-shrink-0 w-12 text-center hidden sm:block">
                    <p className="text-lg font-bold text-foreground leading-none">
                      {date.getDate().toString().padStart(2, "0")}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
                      {date.toLocaleString("vi-VN", { month: "short" })} {date.getFullYear()}
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
                        {cfg.label}
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
                      {appt.hasPrescription && appt.prescriptionId && (
                        <button
                          onClick={() => setOpenPrescriptionId(appt.prescriptionId!)}
                          className={cn(
                            "ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5",
                            "text-[11px] font-medium text-[#41BCE6] bg-[#41BCE6]/10",
                            "hover:bg-[#41BCE6]/20 transition-colors cursor-pointer"
                          )}
                          aria-label={`Xem toa thuốc của ${appt.doctorName}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Xem toa thuốc
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
      {openPrescriptionId && (
        <PrescriptionViewerDialog
          prescription={prescription}
          onClose={() => setOpenPrescriptionId(null)}
        />
      )}
    </>
  );
}
