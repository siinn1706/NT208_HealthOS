"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export type ReminderRepeat = "daily" | "weekly" | "monthly" | "once";

export interface Reminder {
  id: string;
  type: "medicine" | "appointment" | "exercise";
  title: string;
  time: string;
  repeat?: ReminderRepeat;
  done: boolean;
  note?: string;
  /** Optional FK to an appointment, set by the BE when this reminder was auto-created. */
  appointment_id?: string;
  /** B7 — schedule extensions returned by Core BE. */
  tzid?: string;
  weekday_mask?: number | null;
  day_of_month?: number | null;
  next_occurrence_at?: string | null;
}

const WEEKDAY_LABELS: ReadonlyArray<{ index: number; key: string }> = [
  { index: 0, key: "mon" },
  { index: 1, key: "tue" },
  { index: 2, key: "wed" },
  { index: 3, key: "thu" },
  { index: 4, key: "fri" },
  { index: 5, key: "sat" },
  { index: 6, key: "sun" },
];

function detectBrowserTzid(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
  } catch {
    return "Asia/Ho_Chi_Minh";
  }
}

interface AddReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (reminder: Reminder) => void;
}

export function AddReminderDialog({
  open,
  onOpenChange,
  onAdd,
}: AddReminderDialogProps) {
  const t = useTranslations("dashboard.reminders");
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<"medicine" | "appointment" | "exercise">("medicine");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [repeat, setRepeat] = useState<ReminderRepeat>("daily");
  const [note, setNote] = useState("");
  // B7 — schedule extensions; defaults keep the form behaving like the legacy version.
  const [weekdayMask, setWeekdayMask] = useState<number>(0);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [tzid, setTzid] = useState<string>(() => detectBrowserTzid());

  function reset() {
    setType("medicine");
    setTitle("");
    setTime("");
    setRepeat("daily");
    setNote("");
    setWeekdayMask(0);
    setDayOfMonth(1);
    setTzid(detectBrowserTzid());
    setSaving(false);
  }

  function toggleWeekday(index: number) {
    setWeekdayMask((prev) => prev ^ (1 << index));
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !time) return;
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        type,
        title: title.trim(),
        time,
        repeat,
        note: note.trim() || undefined,
        tzid,
      };
      if (repeat === "weekly" && weekdayMask > 0) {
        payload.weekday_mask = weekdayMask;
      }
      if (repeat === "monthly") {
        payload.day_of_month = dayOfMonth;
      }
      const res = await fetch("/api/v1/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        const data = json?.data;
        if (data) {
          onAdd(data as Reminder);
          handleOpenChange(false);
          return;
        }
      }
      toast.error("Không thể tạo nhắc nhở");
    } catch {
      toast.error("Không thể tạo nhắc nhở");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("addReminder")}</DialogTitle>
          <DialogDescription className="sr-only">{t("addReminder")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label>{t("form.type")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medicine">{t("types.medicine")}</SelectItem>
                <SelectItem value="appointment">{t("types.appointment")}</SelectItem>
                <SelectItem value="exercise">{t("types.exercise")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="reminder-title">{t("form.reminderTitle")}</Label>
            <Input
              id="reminder-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-9"
            />
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <Label htmlFor="reminder-time">{t("form.time")}</Label>
            <Input
              id="reminder-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="h-9"
            />
          </div>

          {/* Repeat */}
          <div className="space-y-1.5">
            <Label>{t("form.repeat")}</Label>
            <Select value={repeat} onValueChange={(v) => setRepeat(v as typeof repeat)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("repeatLabels.daily")}</SelectItem>
                <SelectItem value="weekly">{t("repeatLabels.weekly")}</SelectItem>
                <SelectItem value="monthly">{t("repeatLabels.monthly")}</SelectItem>
                <SelectItem value="once">{t("repeatLabels.once")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {repeat === "weekly" && (
            <div className="space-y-1.5">
              <Label>{t("form.weekdays")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map(({ index, key }) => {
                  const active = (weekdayMask & (1 << index)) !== 0;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleWeekday(index)}
                      aria-pressed={active}
                      className={
                        "h-8 min-w-[36px] rounded-md border px-2 text-xs font-medium transition-colors " +
                        (active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted")
                      }
                    >
                      {t(`weekdayShort.${key}` as const)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {repeat === "monthly" && (
            <div className="space-y-1.5">
              <Label htmlFor="reminder-day-of-month">{t("form.dayOfMonth")}</Label>
              <Input
                id="reminder-day-of-month"
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
                className="h-9"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reminder-tzid">{t("form.timezone")}</Label>
            <Input
              id="reminder-tzid"
              value={tzid}
              onChange={(e) => setTzid(e.target.value)}
              className="h-9 font-mono text-xs"
              placeholder="Asia/Ho_Chi_Minh"
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="reminder-note">{t("form.note")}</Label>
            <Input
              id="reminder-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-9"
            />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
              className="cursor-pointer"
            >
              {t("form.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={saving || !title.trim() || !time}
              className="cursor-pointer"
            >
              {saving && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              {t("addReminder")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
