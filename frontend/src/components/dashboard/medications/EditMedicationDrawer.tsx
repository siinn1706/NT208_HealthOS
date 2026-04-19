"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MedicationForm, MedicationPlanDetail } from "@/types/api";

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

interface EditMedicationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MedicationPlanDetail;
  /** Called with the freshly-saved plan; parent should re-fetch detail. */
  onSaved?: () => void;
}

export function EditMedicationDrawer({
  open,
  onOpenChange,
  plan,
  onSaved,
}: EditMedicationDrawerProps) {
  const t = useTranslations("dashboard.medications");
  const tForm = useTranslations("dashboard.medications.form");
  const tWeek = useTranslations("dashboard.medications.weekdayShort");
  const tFormOpts = useTranslations("dashboard.medications.form.formOptions");
  const tRepeatOpts = useTranslations("dashboard.medications.form.repeatOptions");

  // Initial values are derived from the loaded plan + first child reminder.
  const firstDose = plan.doses[0];
  const initialTimes = plan.doses.length
    ? Array.from(new Set(plan.doses.map((d) => d.time))).sort()
    : ["08:00"];

  const [name, setName] = React.useState(plan.name);
  const [strength, setStrength] = React.useState(plan.strength ?? "");
  const [form, setForm] = React.useState<MedicationForm>(
    (plan.form as MedicationForm) ?? "tablet",
  );
  const [doseTimes, setDoseTimes] = React.useState<string[]>(initialTimes);
  const [repeat, setRepeat] = React.useState<Repeat>(
    (firstDose?.repeat as Repeat) ?? "daily",
  );
  const [weekdayMask, setWeekdayMask] = React.useState<number>(
    firstDose?.weekday_mask ?? 0,
  );
  const [dayOfMonth, setDayOfMonth] = React.useState<number>(
    firstDose?.day_of_month ?? 1,
  );
  const [endDate, setEndDate] = React.useState(plan.end_date ?? "");
  const [instructions, setInstructions] = React.useState(plan.instructions ?? "");
  // P2-review-fe — surface `review_due_at` so the daily review-reminder beat
  // (`compute_medication_signals`) actually has a date to fire on. Without
  // this UI, the schema field was effectively dead.
  const [reviewDueAt, setReviewDueAt] = React.useState(plan.review_due_at ?? "");
  const [scheduleDirty, setScheduleDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // When the underlying plan changes (parent re-fetched), reset the form.
  React.useEffect(() => {
    if (!open) return;
    setName(plan.name);
    setStrength(plan.strength ?? "");
    setForm((plan.form as MedicationForm) ?? "tablet");
    setDoseTimes(
      plan.doses.length
        ? Array.from(new Set(plan.doses.map((d) => d.time))).sort()
        : ["08:00"],
    );
    setRepeat((plan.doses[0]?.repeat as Repeat) ?? "daily");
    setWeekdayMask(plan.doses[0]?.weekday_mask ?? 0);
    setDayOfMonth(plan.doses[0]?.day_of_month ?? 1);
    setEndDate(plan.end_date ?? "");
    setInstructions(plan.instructions ?? "");
    setReviewDueAt(plan.review_due_at ?? "");
    setScheduleDirty(false);
  }, [open, plan]);

  const updateDoseTime = (idx: number, value: string) => {
    setDoseTimes((prev) => prev.map((t, i) => (i === idx ? value : t)));
    setScheduleDirty(true);
  };
  const addDoseTime = () => {
    if (doseTimes.length >= 8) return;
    setDoseTimes((prev) => [...prev, "12:00"]);
    setScheduleDirty(true);
  };
  const removeDoseTime = (idx: number) => {
    if (doseTimes.length <= 1) return;
    setDoseTimes((prev) => prev.filter((_, i) => i !== idx));
    setScheduleDirty(true);
  };
  const toggleWeekday = (idx: number) => {
    setWeekdayMask((prev) => prev ^ (1 << idx));
    setScheduleDirty(true);
  };

  // M4 — match Add's HH:MM regex check before letting submit fire so the
  // browser-supplied <input type="time"> can't slip junk through.
  const dosesValid = doseTimes.every((d) => /^\d{2}:\d{2}$/.test(d));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosesValid) return;

    // P2-schedule-rebuild-warn — surface the destructive history-loss before
    // the server CASCADEs occurrence rows. `confirm` is sync + native; that's
    // intentional for a one-line guardrail rather than a custom modal.
    if (
      scheduleDirty &&
      typeof window !== "undefined" &&
      !window.confirm(tForm("scheduleRebuildWarning"))
    ) {
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        strength: strength.trim() || null,
        form,
        instructions: instructions.trim() || null,
        end_date: endDate || null,
        review_due_at: reviewDueAt || null,
      };
      if (scheduleDirty) {
        payload.dose_times = doseTimes;
        payload.repeat = repeat;
        // M3 — match AddMedicationDialog: only send the mask when the user
        // explicitly picked at least one weekday. Empty mask falls through
        // to the server's legacy "every day" lenience for back-compat.
        if (repeat === "weekly" && weekdayMask > 0) {
          payload.weekday_mask = weekdayMask;
        }
        if (repeat === "monthly") payload.day_of_month = dayOfMonth;
      }
      const res = await fetch(
        `/api/v1/medications/${encodeURIComponent(plan.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        toast.error(tForm("saveError"));
        return;
      }
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error(tForm("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-md w-full overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>{t("detail.edit")}</SheetTitle>
          <SheetDescription>{plan.name}</SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="space-y-4 mt-4 px-4 sm:px-6">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">{tForm("name")}</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-strength">{tForm("strength")}</Label>
              <Input
                id="edit-strength"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
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

          <div className="space-y-1.5">
            <Label>{tForm("doseTimes")}</Label>
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
                      <X className="w-3 h-3" />
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
                  <Plus className="w-3 h-3" />
                  {tForm("addTime")}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{tForm("repeat")}</Label>
            <Select
              value={repeat}
              onValueChange={(v) => {
                setRepeat(v as Repeat);
                setScheduleDirty(true);
              }}
            >
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
              <Label htmlFor="edit-dom">{tForm("dayOfMonth")}</Label>
              <Input
                id="edit-dom"
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => {
                  setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)));
                  setScheduleDirty(true);
                }}
                className="h-9 w-24"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-end">{tForm("endDate")}</Label>
              <Input
                id="edit-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={plan.start_date}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-review-due">{tForm("reviewDueAt")}</Label>
              <Input
                id="edit-review-due"
                type="date"
                value={reviewDueAt}
                onChange={(e) => setReviewDueAt(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-instructions">{tForm("instructions")}</Label>
            <Textarea
              id="edit-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </div>

          <SheetFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {tForm("cancel")}
            </Button>
            <Button type="submit" disabled={!name.trim() || !dosesValid || saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {saving ? tForm("submitting") : tForm("submit")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
