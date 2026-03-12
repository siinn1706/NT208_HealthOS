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

export interface Reminder {
  id: string;
  type: "medicine" | "appointment" | "exercise";
  title: string;
  time: string;
  repeat?: "daily" | "weekly" | "once";
  done: boolean;
  note?: string;
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
  const [repeat, setRepeat] = useState<"daily" | "weekly" | "once">("daily");
  const [note, setNote] = useState("");

  function reset() {
    setType("medicine");
    setTitle("");
    setTime("");
    setRepeat("daily");
    setNote("");
    setSaving(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !time) return;
    setSaving(true);

    // BFF TODO: POST /api/v1/reminders
    //   Request: { type, title, time, repeat, note }
    //   Response: Reminder with server-assigned id
    //   Fallback: optimistic local id
    try {
      const res = await fetch("/api/v1/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          time,
          repeat,
          note: note.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onAdd({ done: false, ...data });
        handleOpenChange(false);
        return;
      }
    } catch {
      // BFF unavailable — optimistic fallback
    }

    onAdd({
      id: `r-${Date.now()}`,
      type,
      title: title.trim(),
      time,
      repeat,
      done: false,
      note: note.trim() || undefined,
    });
    handleOpenChange(false);
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
                <SelectItem value="once">{t("repeatLabels.once")}</SelectItem>
              </SelectContent>
            </Select>
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
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {t("addReminder")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
