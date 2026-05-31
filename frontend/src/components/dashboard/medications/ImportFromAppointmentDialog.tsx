"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pill, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MedicationDisclaimer } from "@/components/dashboard/medications/MedicationDisclaimer";
import { cn } from "@/lib/utils";
import type {
  MedicationImportResult,
  PrescriptionMedicine,
} from "@/types/api";

interface ImportFromAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  /** Caller passes the prescription medicines so we can show the picker
   * without an extra round-trip — the import POST itself is server-side. */
  medicines: PrescriptionMedicine[];
  onImported?: (result: MedicationImportResult) => void;
}

/**
 * The form lets the user un-check medicines they don't want to track and
 * pick a single shared default schedule (the server backfills per-medicine
 * heuristics when this is empty). For finer per-med scheduling, the user
 * can edit each created plan afterwards.
 */
export function ImportFromAppointmentDialog({
  open,
  onOpenChange,
  appointmentId,
  medicines,
  onImported,
}: ImportFromAppointmentDialogProps) {
  const t = useTranslations("dashboard.medications.import");
  const [selected, setSelected] = React.useState<Set<number>>(
    () => new Set(medicines.map((_, i) => i)),
  );
  const [doseTimes, setDoseTimes] = React.useState<string[]>(["08:00"]);
  const [submitting, setSubmitting] = React.useState(false);
  const [resultCounts, setResultCounts] = React.useState<{ created: number; skipped: number } | null>(null);

  const allSelected = selected.size === medicines.length;

  const toggle = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const updateDoseTime = (idx: number, value: string) => {
    setDoseTimes((prev) => prev.map((t, i) => (i === idx ? value : t)));
  };

  const addDoseTime = () => {
    if (doseTimes.length >= 8) return;
    setDoseTimes((prev) => [...prev, "12:00"]);
  };

  const removeDoseTime = (idx: number) => {
    if (doseTimes.length <= 1) return;
    setDoseTimes((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.size === 0) {
      toast.error(t("noMedicines"));
      return;
    }
    setSubmitting(true);
    try {
      // Honor the per-medicine selection by sending `medicine_indices` to the
      // Core endpoint. The server still dedupes via `dedupe_key` so re-runs
      // are safe, but un-checked rows are now genuinely excluded from the
      // import (previously the checkboxes were decorative).
      const indices = Array.from(selected).sort((a, b) => a - b);
      const res = await fetch(
        `/api/v1/medications/import/${encodeURIComponent(appointmentId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            default_dose_times: doseTimes,
            default_repeat: "daily",
            medicine_indices: indices,
          }),
        },
      );
      if (!res.ok) {
        toast.error(t("createFailed"));
        return;
      }
      const json = await res.json().catch(() => null);
      const result = (json?.data ?? null) as MedicationImportResult | null;
      if (result) {
        setResultCounts({
          created: result.created.length,
          skipped: result.skipped.length,
        });
        onImported?.(result);
      }
    } catch {
      toast.error(t("createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="text-xs">
            {t("subtitle")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Medicines list */}
          {medicines.length === 0 ? (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {t("noMedicines")}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  {selected.size} / {medicines.length}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      allSelected
                        ? new Set()
                        : new Set(medicines.map((_, i) => i)),
                    )
                  }
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  {allSelected ? t("deselectAll") : t("selectAll")}
                </button>
              </div>
              <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
                {medicines.map((med, idx) => {
                  const checked = selected.has(idx);
                  return (
                    <li
                      key={`${med.name}-${med.dosage}-${med.frequency}-${med.duration}`}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm transition-colors",
                        checked
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-background",
                      )}
                    >
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(idx)}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground inline-flex items-center gap-2">
                            <Pill className="size-3.5 text-muted-foreground" aria-hidden />
                            {med.name || (
                              <span className="text-muted-foreground italic">
                                {t("missingName")}
                              </span>
                            )}
                          </p>
                          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            {med.dosage && <span>{med.dosage}</span>}
                            {med.frequency && <span>{med.frequency}</span>}
                            {med.duration && <span>{med.duration}</span>}
                          </div>
                          {med.notes && (
                            <p className="mt-1 text-[11px] italic text-muted-foreground">
                              {med.notes}
                            </p>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>

              {/* Default dose times — applied when frequency text can't be parsed. */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  {t("doseTimesLabel")}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {doseTimes.map((time, idx) => (
                    <div
                      key={`${idx}-${time}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1"
                    >
                      <input
                        type="time"
                        aria-label={t("doseTimesLabel")}
                        value={time}
                        onChange={(e) => updateDoseTime(idx, e.target.value)}
                        className="h-7 w-[88px] bg-transparent text-xs outline-none"
                      />
                      {doseTimes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDoseTime(idx)}
                          className="text-muted-foreground hover:text-destructive cursor-pointer"
                          aria-label="Remove time"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {doseTimes.length < 8 && (
                    <button
                      type="button"
                      onClick={addDoseTime}
                      className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 h-9 text-xs text-muted-foreground hover:bg-muted cursor-pointer"
                    >
                      <Plus className="size-3" />
                      Add time
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {resultCounts && (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
              {t("result", {
                created: resultCounts.created,
                skipped: resultCounts.skipped,
              })}
            </div>
          )}

          <MedicationDisclaimer tone="dialog" />

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={submitting || medicines.length === 0}
            >
              {submitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              {submitting ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
