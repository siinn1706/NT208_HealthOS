"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Edit2,
  FileText,
  Loader2,
  Stethoscope,
  UserX,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrescriptionViewerDialog } from "./PrescriptionViewerDialog";
import { normalizeAppointment } from "./appointment-normalizer";
import type { Appointment, AppointmentStatus } from "@/types/api";

type ActionLabelKey = "markInProgress" | "markCompleted" | "markNoShow" | "markCancelled";

// Valid status transitions the user can trigger from the UI.
const STATUS_ACTIONS: Partial<
  Record<
    AppointmentStatus,
    Array<{
      target: AppointmentStatus;
      labelKey: ActionLabelKey;
      colorClass: string;
      icon: LucideIcon;
    }>
  >
> = {
  booked: [
    { target: "cancelled", labelKey: "markCancelled", colorClass: "border-destructive/40 text-destructive hover:bg-destructive/10", icon: XCircle },
  ],
  scheduled: [
    { target: "cancelled", labelKey: "markCancelled", colorClass: "border-destructive/40 text-destructive hover:bg-destructive/10", icon: XCircle },
  ],
  upcoming: [
    { target: "in_progress", labelKey: "markInProgress", colorClass: "border-info/40 text-info hover:bg-info/10",         icon: Activity },
    { target: "completed",   labelKey: "markCompleted",  colorClass: "border-success/40 text-success hover:bg-success/10", icon: CheckCircle2 },
    { target: "no_show",     labelKey: "markNoShow",     colorClass: "border-warning/40 text-warning hover:bg-warning/10", icon: UserX },
    { target: "cancelled",   labelKey: "markCancelled",  colorClass: "border-destructive/40 text-destructive hover:bg-destructive/10", icon: XCircle },
  ],
  in_progress: [
    { target: "completed", labelKey: "markCompleted",  colorClass: "border-success/40 text-success hover:bg-success/10", icon: CheckCircle2 },
    { target: "no_show",   labelKey: "markNoShow",     colorClass: "border-warning/40 text-warning hover:bg-warning/10", icon: UserX },
    { target: "cancelled", labelKey: "markCancelled",  colorClass: "border-destructive/40 text-destructive hover:bg-destructive/10", icon: XCircle },
  ],
};

const STATUS_BADGE_COLOR: Record<AppointmentStatus, string> = {
  booked: "bg-info/10 text-info",
  scheduled: "bg-info/10 text-info",
  upcoming: "bg-primary/10 text-primary",
  in_progress: "bg-info/10 text-info",
  completed: "bg-success/10 text-success",
  cancelled: "bg-muted text-muted-foreground",
  no_show: "bg-warning/10 text-warning",
  rescheduled: "bg-info/10 text-info",
};

interface FormState {
  doctorName: string;
  specialty: string;
  clinic: string;
  date: string;
  time: string;
  reason: string;
  notes: string;
}

function initForm(appt: Appointment): FormState {
  const dt = new Date(appt.date);
  const valid = !Number.isNaN(dt.getTime());
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const h = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");

  return {
    doctorName: appt.doctorName,
    specialty: appt.specialty === "N/A" ? "" : appt.specialty,
    clinic: appt.clinic === "N/A" ? "" : appt.clinic,
    date: valid ? `${y}-${mo}-${d}` : "",
    time: valid ? `${h}:${mi}` : "09:00",
    reason: appt.diagnosis,
    notes: appt.notes ?? "",
  };
}

interface Props {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (updated: Appointment) => void;
}

export function AppointmentDetailSheet({
  appointment,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  const t = useTranslations("dashboard.appointments");
  const tStatus = useTranslations("dashboard.appointments.status");
  const locale = useLocale();

  const [mode, setMode] = useState<"read" | "edit">("read");
  const [form, setForm] = useState<FormState>(() =>
    appointment
      ? initForm(appointment)
      : {
          doctorName: "",
          specialty: "",
          clinic: "",
          date: "",
          time: "09:00",
          reason: "",
          notes: "",
        },
  );
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setMode("read");
      setPrescriptionOpen(false);
    }
    onOpenChange(next);
  }

  async function handleSave() {
    if (!appointment) return;
    if (!form.doctorName.trim() || !form.date || !form.time) {
      toast.error(t("create.missingRequired"));
      return;
    }
    setSaving(true);
    try {
      const isoDate = new Date(`${form.date}T${form.time}:00`).toISOString();
      const res = await fetch(
        `/api/v1/appointments/${encodeURIComponent(appointment.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointment_date: isoDate,
            doctor_name: form.doctorName.trim() || undefined,
            specialty: form.specialty.trim() || undefined,
            clinic: form.clinic.trim() || undefined,
            reason: form.reason.trim() || undefined,
            notes: form.notes.trim() || undefined,
          }),
        },
      );
      if (!res.ok) throw new Error("save failed");
      const json = await res.json().catch(() => null);
      const updated = normalizeAppointment(json?.data, t("noData"));
      if (updated) {
        onUpdated(updated);
        setMode("read");
        toast.success(t("edit.saved"));
      }
    } catch {
      toast.error(t("edit.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusUpdate(target: AppointmentStatus) {
    if (!appointment) return;
    setStatusBusy(target);
    try {
      const res = await fetch(
        `/api/v1/appointments/${encodeURIComponent(appointment.id)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: target }),
        },
      );
      if (!res.ok) throw new Error("status update failed");
      const json = await res.json().catch(() => null);
      const updated = normalizeAppointment(json?.data, t("noData"));
      if (updated) {
        onUpdated(updated);
        toast.success(t("statusAction.updated"));
      }
    } catch {
      toast.error(t("statusAction.updateFailed"));
    } finally {
      setStatusBusy(null);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (!appointment) return null;

  const dt = new Date(appointment.date);
  const isValidDate = !Number.isNaN(dt.getTime());
  const dateStr = isValidDate
    ? dt.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "--";
  const timeStr = isValidDate
    ? dt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
    : "--";

  const actions = STATUS_ACTIONS[appointment.status] ?? [];
  const isTerminal = actions.length === 0;

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col gap-0 p-0"
        >
          {/* ── Header ── */}
          <SheetHeader className="px-5 py-4 border-b border-border space-y-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Stethoscope className="size-4 text-primary flex-shrink-0" aria-hidden />
                <SheetTitle className="text-base truncate">
                  {mode === "edit" ? t("edit.title") : t("detail.title")}
                </SheetTitle>
              </div>
              {mode === "read" && !isTerminal && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setForm(initForm(appointment));
                    setMode("edit");
                  }}
                  className="flex-shrink-0 gap-1.5"
                >
                  <Edit2 className="size-3.5" aria-hidden />
                  {t("edit.title").split(" ")[0]}
                </Button>
              )}
              {mode === "edit" && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => setMode("read")}
                    className="gap-1.5"
                  >
                    <X className="size-3.5" aria-hidden />
                    {t("edit.cancel")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={handleSave}
                    className="gap-1.5"
                  >
                    {saving && <Loader2 className="size-3.5 animate-spin" />}
                    {saving ? t("edit.saving") : t("edit.save")}
                  </Button>
                </div>
              )}
            </div>
            <SheetDescription className="text-xs sr-only">
              {appointment.doctorName}
            </SheetDescription>
          </SheetHeader>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {mode === "read" ? (
              <>
                {/* Status badge */}
                <StatusBadge status={appointment.status} tStatus={tStatus} />

                {/* Date / Time */}
                <DetailRow icon={Calendar} label={`${dateStr} · ${timeStr}`} />

                {/* Doctor */}
                <DetailRow
                  icon={Stethoscope}
                  label={appointment.doctorName}
                  sub={[appointment.specialty, appointment.clinic]
                    .filter((v) => v && v !== "N/A")
                    .join(" · ")}
                />

                {/* Diagnosis */}
                {appointment.diagnosis && (
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      {t("detail.diagnosis")}
                    </p>
                    <p className="text-sm text-foreground leading-snug">
                      {appointment.diagnosis}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {appointment.notes ? (
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      {t("create.notes")}
                    </p>
                    <p className="text-sm text-foreground leading-snug">
                      {appointment.notes}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    {t("detail.noNotes")}
                  </p>
                )}

                {/* Prescription */}
                {appointment.hasPrescription && appointment.prescription && (
                  <button
                    type="button"
                    onClick={() => setPrescriptionOpen(true)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5",
                      "px-4 py-3 text-left transition-colors hover:bg-primary/10",
                    )}
                  >
                    <FileText className="size-4 text-primary flex-shrink-0" aria-hidden />
                    <span className="flex-1 text-sm font-medium text-primary">
                      {t("viewPrescription")}
                    </span>
                  </button>
                )}

                {/* Status actions */}
                {!isTerminal && actions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("statusAction.title")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {actions.map(({ target, labelKey, colorClass, icon: Icon }) => (
                        <button
                          key={target}
                          type="button"
                          disabled={statusBusy !== null}
                          onClick={() => handleStatusUpdate(target)}
                          className={cn(
                            "flex items-center justify-center gap-2 rounded-lg border px-3 py-2",
                            "text-xs font-medium transition-colors cursor-pointer",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            colorClass,
                          )}
                        >
                          {statusBusy === target ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <Icon className="size-3.5" aria-hidden />
                          )}
                          {t(
                            `statusAction.${labelKey}` as Parameters<typeof t>[0],
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ── Edit form ── */
              <div className="space-y-4">
                <Field label={t("edit.doctorName")} required>
                  <Input
                    autoFocus
                    value={form.doctorName}
                    onChange={(e) => update("doctorName", e.target.value)}
                    placeholder="BS. Nguyễn Thị A"
                  />
                </Field>
                <Field label={t("edit.specialty")}>
                  <Input
                    value={form.specialty}
                    onChange={(e) => update("specialty", e.target.value)}
                    placeholder={t("create.specialtyPlaceholder")}
                  />
                </Field>
                <Field label={t("edit.clinic")}>
                  <Input
                    value={form.clinic}
                    onChange={(e) => update("clinic", e.target.value)}
                    placeholder={t("create.clinicPlaceholder")}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("edit.date")} required>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => update("date", e.target.value)}
                    />
                  </Field>
                  <Field label={t("edit.time")} required>
                    <Input
                      type="time"
                      value={form.time}
                      onChange={(e) => update("time", e.target.value)}
                    />
                  </Field>
                </div>
                <Field label={t("edit.reason")}>
                  <Input
                    value={form.reason}
                    onChange={(e) => update("reason", e.target.value)}
                    placeholder={t("create.reasonPlaceholder")}
                  />
                </Field>
                <Field label={t("edit.notes")}>
                  <textarea
                    aria-label={t("edit.notes")}
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    rows={3}
                    placeholder={t("create.notesPlaceholder")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none resize-none"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <SheetFooter className="px-5 py-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleOpenChange(false)}
            >
              {t("close")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Prescription dialog — rendered outside Sheet to avoid portal conflicts */}
      {appointment.hasPrescription && appointment.prescription && (
        <PrescriptionViewerDialog
          prescription={prescriptionOpen ? appointment.prescription : null}
          appointmentId={appointment.id}
          onClose={() => setPrescriptionOpen(false)}
        />
      )}
    </>
  );
}

function StatusBadge({
  status,
  tStatus,
}: {
  status: AppointmentStatus;
  tStatus: ReturnType<typeof useTranslations>;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        STATUS_BADGE_COLOR[status],
      )}
    >
      {tStatus(status)}
    </span>
  );
}

function DetailRow({
  icon: Icon,
  label,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm text-foreground leading-snug">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
