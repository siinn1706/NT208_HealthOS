"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MedicationDisclaimer } from "@/components/dashboard/medications/MedicationDisclaimer";
import { cn } from "@/lib/utils";
import type { MedicationForm, MedicationPlan } from "@/types/api";

const FORMS: MedicationForm[] = [
  "tablet",
  "capsule",
  "liquid",
  "injection",
  "drops",
  "other",
];

const REPEATS = ["daily", "weekly", "monthly", "once"] as const;
type Repeat = (typeof REPEATS)[number];

const WEEKDAYS = [
  { idx: 0, key: "mon" as const },
  { idx: 1, key: "tue" as const },
  { idx: 2, key: "wed" as const },
  { idx: 3, key: "thu" as const },
  { idx: 4, key: "fri" as const },
  { idx: 5, key: "sat" as const },
  { idx: 6, key: "sun" as const },
];

interface AddMedicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (plan: MedicationPlan) => void;
}

function detectTzid(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
  } catch {
    return "Asia/Ho_Chi_Minh";
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddMedicationDialog({
  open,
  onOpenChange,
  onCreated,
}: AddMedicationDialogProps) {
  const t = useTranslations("dashboard.medications");
  const tForm = useTranslations("dashboard.medications.form");
  const tWeek = useTranslations("dashboard.medications.weekdayShort");
  const tFormOpts = useTranslations("dashboard.medications.form.formOptions");
  const tRepeatOpts = useTranslations("dashboard.medications.form.repeatOptions");

  const [name, setName] = React.useState("");
  const [genericName, setGenericName] = React.useState("");
  const [strength, setStrength] = React.useState("");
  const [form, setForm] = React.useState<MedicationForm>("tablet");
  const [doseTimes, setDoseTimes] = React.useState<string[]>(["08:00"]);
  const [repeat, setRepeat] = React.useState<Repeat>("daily");
  const [weekdayMask, setWeekdayMask] = React.useState(0);
  const [dayOfMonth, setDayOfMonth] = React.useState(1);
  const [startDate, setStartDate] = React.useState(() => todayIso());
  const [endDate, setEndDate] = React.useState("");
  const [instructions, setInstructions] = React.useState("");
  const [prescriber, setPrescriber] = React.useState("");
  const [clinic, setClinic] = React.useState("");
  const [supplyUnits, setSupplyUnits] = React.useState("");
  const [refillCadence, setRefillCadence] = React.useState("");
  const [tzid, setTzid] = React.useState(() => detectTzid());
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [showRefill, setShowRefill] = React.useState(false);

  const reset = React.useCallback(() => {
    setName("");
    setGenericName("");
    setStrength("");
    setForm("tablet");
    setDoseTimes(["08:00"]);
    setRepeat("daily");
    setWeekdayMask(0);
    setDayOfMonth(1);
    setStartDate(todayIso());
    setEndDate("");
    setInstructions("");
    setPrescriber("");
    setClinic("");
    setSupplyUnits("");
    setRefillCadence("");
    setTzid(detectTzid());
    setNotes("");
    setShowRefill(false);
    setSaving(false);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
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

  const toggleWeekday = (idx: number) => {
    setWeekdayMask((prev) => prev ^ (1 << idx));
  };

  const canSubmit = name.trim().length > 0 && doseTimes.every((t) => /^\d{2}:\d{2}$/.test(t));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        dose_times: doseTimes,
        repeat,
        tzid,
        start_date: startDate,
      };
      if (genericName.trim()) payload.generic_name = genericName.trim();
      if (strength.trim()) payload.strength = strength.trim();
      if (form) payload.form = form;
      if (instructions.trim()) payload.instructions = instructions.trim();
      if (prescriber.trim()) payload.prescriber = prescriber.trim();
      if (clinic.trim()) payload.clinic = clinic.trim();
      if (endDate) payload.end_date = endDate;
      if (notes.trim()) payload.notes = notes.trim();
      if (repeat === "weekly" && weekdayMask > 0) payload.weekday_mask = weekdayMask;
      if (repeat === "monthly") payload.day_of_month = dayOfMonth;
      if (showRefill && supplyUnits) {
        const n = parseInt(supplyUnits, 10);
        if (Number.isFinite(n) && n >= 0) payload.refill_supply_units = n;
      }
      if (showRefill && refillCadence) {
        const n = parseInt(refillCadence, 10);
        if (Number.isFinite(n) && n >= 1) payload.refill_cadence_days = n;
      }

      const res = await fetch("/api/v1/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 422 || res.status === 400) {
          toast.error(tForm("validationError"));
        } else {
          toast.error(tForm("saveError"));
        }
        return;
      }
      const json = await res.json().catch(() => null);
      const plan = (json?.data ?? null) as MedicationPlan | null;
      if (plan) {
        onCreated?.(plan);
        handleOpenChange(false);
      }
    } catch {
      toast.error(tForm("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
          <DialogDescription className="sr-only">{t("add")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name + generic */}
          <div className="space-y-1.5">
            <Label htmlFor="med-name">
              {tForm("name")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="med-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tForm("namePlaceholder")}
              required
              maxLength={255}
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="med-strength">{tForm("strength")}</Label>
              <Input
                id="med-strength"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder={tForm("strengthPlaceholder")}
                maxLength={64}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{tForm("form")}</Label>
              <Select value={form} onValueChange={(v) => setForm(v as MedicationForm)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {tFormOpts(f as Parameters<typeof tFormOpts>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dose times */}
          <div className="space-y-1.5">
            <Label>
              {tForm("doseTimes")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">{tForm("doseTimesHint")}</p>
            <div className="flex flex-wrap items-center gap-2">
              {doseTimes.map((time, idx) => (
                <div
                  key={`${idx}-${time}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1"
                >
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => updateDoseTime(idx, e.target.value)}
                    className="h-7 w-[88px] bg-transparent text-xs outline-none"
                    aria-label={`Dose ${idx + 1}`}
                  />
                  {doseTimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDoseTime(idx)}
                      aria-label={tForm("removeTime")}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
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
                  {tForm("addTime")}
                </button>
              )}
            </div>
          </div>

          {/* Repeat */}
          <div className="space-y-1.5">
            <Label>{tForm("repeat")}</Label>
            <Select value={repeat} onValueChange={(v) => setRepeat(v as Repeat)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPEATS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {tRepeatOpts(r as Parameters<typeof tRepeatOpts>[0])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {repeat === "weekly" && (
            <div className="space-y-1.5">
              <Label>{tForm("weekdays")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map(({ idx, key }) => {
                  const active = (weekdayMask & (1 << idx)) !== 0;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleWeekday(idx)}
                      aria-pressed={active}
                      className={cn(
                        "h-8 min-w-[36px] rounded-md border px-2 text-xs font-medium transition-colors cursor-pointer",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {tWeek(key)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {repeat === "monthly" && (
            <div className="space-y-1.5">
              <Label htmlFor="med-dom">{tForm("dayOfMonth")}</Label>
              <Input
                id="med-dom"
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) =>
                  setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)))
                }
                className="h-9 w-24"
              />
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="med-start">{tForm("startDate")}</Label>
              <Input
                id="med-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-end">{tForm("endDate")}</Label>
              <Input
                id="med-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="h-9"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <Label htmlFor="med-instructions">{tForm("instructions")}</Label>
            <Textarea
              id="med-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={tForm("instructionsPlaceholder")}
              rows={2}
              maxLength={2000}
            />
          </div>

          {/* Refill (collapsed) */}
          <div className="border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setShowRefill((v) => !v)}
              className="text-xs font-medium text-primary hover:underline cursor-pointer"
              aria-expanded={showRefill}
            >
              {tForm("refillSection")} {showRefill ? "−" : "+"}
            </button>
            {showRefill && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="med-supply">{tForm("supplyUnits")}</Label>
                  <Input
                    id="med-supply"
                    type="number"
                    min={0}
                    max={100000}
                    value={supplyUnits}
                    onChange={(e) => setSupplyUnits(e.target.value)}
                    className="h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {tForm("supplyUnitsHint")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="med-cadence">{tForm("refillCadenceDays")}</Label>
                  <Input
                    id="med-cadence"
                    type="number"
                    min={1}
                    max={365}
                    value={refillCadence}
                    onChange={(e) => setRefillCadence(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>

          <MedicationDisclaimer tone="dialog" />

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
              className="cursor-pointer"
            >
              {tForm("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit || saving} className="cursor-pointer">
              {saving && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              {saving ? tForm("submitting") : tForm("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
