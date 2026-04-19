"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/api";

const STEP_KEYS = ["who", "when", "purpose", "review"] as const;
type StepKey = (typeof STEP_KEYS)[number];

interface AppointmentCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (appointment: Appointment) => void;
}

interface FormState {
  doctorName: string;
  specialty: string;
  clinic: string;
  date: string;
  time: string;
  reason: string;
  notes: string;
}

const EMPTY: FormState = {
  doctorName: "",
  specialty: "",
  clinic: "",
  date: "",
  time: "",
  reason: "",
  notes: "",
};

/**
 * Multi-step Sheet for creating an appointment.
 *
 * Posts to the existing `POST /api/v1/appointments` endpoint. Auto-reminder
 * generation, attachments, and rich detail sheets are scoped to subsequent
 * BE work in sub-plan F §3.2; this sheet keeps the BE contract unchanged.
 */
export function AppointmentCreateSheet({
  open,
  onOpenChange,
  onCreated,
}: AppointmentCreateSheetProps) {
  const t = useTranslations("dashboard.appointments.create");
  const tVp = useTranslations("dashboard.visitPrep");
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<StepKey>("who");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const stepIndex = STEP_KEYS.indexOf(step);

  const canAdvance = useMemo(() => {
    switch (step) {
      case "who":
        return form.doctorName.trim().length > 0;
      case "when":
        return Boolean(form.date && form.time);
      case "purpose":
        return form.reason.trim().length > 0;
      case "review":
        return true;
    }
  }, [step, form]);

  function reset() {
    setForm(EMPTY);
    setStep("who");
    setSaving(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit() {
    if (!form.doctorName.trim() || !form.date || !form.time || !form.reason.trim()) {
      toast.error(t("missingRequired"));
      return;
    }
    setSaving(true);
    try {
      const isoDate = new Date(`${form.date}T${form.time}:00`).toISOString();
      const res = await fetch("/api/v1/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_date: isoDate,
          doctor_name: form.doctorName.trim(),
          specialty: form.specialty.trim() || undefined,
          clinic: form.clinic.trim() || undefined,
          reason: form.reason.trim(),
          notes: form.notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("create failed");
      const json = await res.json().catch(() => null);
      const created = (json?.data ?? json) as Appointment | null;
      if (created) onCreated?.(created);
      toast.success(t("saved"));
      handleOpenChange(false);

      // Visit-prep CTA — non-blocking. Lets the user continue into the brief
      // flow with the new appointment id pre-attached. Skipped silently if
      // the BE didn't echo back a usable id.
      if (created?.id) {
        toast(tVp("newBrief"), {
          description: tVp("pageSubtitle"),
          action: {
            label: tVp("list.startCta"),
            onClick: () => {
              router.push(
                `/${locale}/dashboard/visit-prep/new?attach=${encodeURIComponent(created.id)}`,
              );
            },
          },
          duration: 10_000,
        });
      }
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    const idx = STEP_KEYS.indexOf(step);
    if (idx < STEP_KEYS.length - 1) setStep(STEP_KEYS[idx + 1]);
  }

  function goBack() {
    const idx = STEP_KEYS.indexOf(step);
    if (idx > 0) setStep(STEP_KEYS[idx - 1]);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col gap-0 p-0"
      >
        <SheetHeader className="px-5 py-4 border-b border-border space-y-1">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4 text-primary" aria-hidden />
            {t("title")}
          </SheetTitle>
          <SheetDescription className="text-xs">{t("subtitle")}</SheetDescription>
        </SheetHeader>

        {/* Step bar */}
        <ol className="flex items-center gap-1 px-5 py-3 border-b border-border bg-muted/20">
          {STEP_KEYS.map((s, idx) => (
            <li
              key={s}
              className={cn(
                "flex-1 text-[10px] font-medium uppercase tracking-wide text-center px-1 py-1 rounded-md border transition-colors",
                idx === stepIndex
                  ? "bg-primary text-primary-foreground border-primary"
                  : idx < stepIndex
                    ? "border-primary/40 text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {t(`step${capitalize(s)}` as Parameters<typeof t>[0])}
            </li>
          ))}
        </ol>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {step === "who" && (
            <>
              <Field label={t("doctorName")} required>
                <Input
                  autoFocus
                  placeholder={t("doctorNamePlaceholder")}
                  value={form.doctorName}
                  onChange={(e) => update("doctorName", e.target.value)}
                />
              </Field>
              <Field label={t("specialty")}>
                <Input
                  placeholder={t("specialtyPlaceholder")}
                  value={form.specialty}
                  onChange={(e) => update("specialty", e.target.value)}
                />
              </Field>
              <Field label={t("clinic")}>
                <Input
                  placeholder={t("clinicPlaceholder")}
                  value={form.clinic}
                  onChange={(e) => update("clinic", e.target.value)}
                />
              </Field>
            </>
          )}

          {step === "when" && (
            <>
              <Field label={t("date")} required>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </Field>
              <Field label={t("time")} required>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => update("time", e.target.value)}
                />
              </Field>
            </>
          )}

          {step === "purpose" && (
            <>
              <Field label={t("reason")} required>
                <Input
                  placeholder={t("reasonPlaceholder")}
                  value={form.reason}
                  onChange={(e) => update("reason", e.target.value)}
                />
              </Field>
              <Field label={t("notes")}>
                <textarea
                  placeholder={t("notesPlaceholder")}
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none resize-none"
                />
              </Field>
            </>
          )}

          {step === "review" && (
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 text-sm">
              <ReviewLine label={t("doctorName")} value={form.doctorName} />
              <ReviewLine label={t("specialty")} value={form.specialty || "—"} />
              <ReviewLine label={t("clinic")} value={form.clinic || "—"} />
              <ReviewLine label={t("date")} value={`${form.date} ${form.time}`} />
              <ReviewLine label={t("reason")} value={form.reason} />
              {form.notes && <ReviewLine label={t("notes")} value={form.notes} />}
            </div>
          )}
        </div>

        <SheetFooter className="px-5 py-4 border-t border-border flex-row gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={stepIndex === 0 || saving}
            onClick={goBack}
            className="gap-1.5"
          >
            <ArrowLeft className="size-3.5" />
            {t("back")}
          </Button>
          {step === "review" ? (
            <Button type="button" disabled={saving} onClick={handleSubmit} className="gap-1.5">
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {saving ? t("saving") : t("save")}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canAdvance || saving}
              onClick={goNext}
              className="gap-1.5"
            >
              {t("next")}
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
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

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right break-words">
        {value}
      </span>
    </div>
  );
}

function capitalize<T extends string>(s: T): Capitalize<T> {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<T>;
}
