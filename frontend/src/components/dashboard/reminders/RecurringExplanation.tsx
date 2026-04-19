"use client";

import { useTranslations } from "next-intl";

import type { ReminderRepeat } from "./AddReminderDialog";

interface RecurringExplanationProps {
  repeat?: ReminderRepeat;
  time: string;
}

/**
 * Plain-text explanation of a reminder's schedule (per UX sub-plan F §3.2).
 * Renders nothing when neither `repeat` nor `time` is meaningful so callers
 * can drop it into a row without conditional padding.
 */
export function RecurringExplanation({ repeat, time }: RecurringExplanationProps) {
  const t = useTranslations("dashboard.reminders.explain");

  if (!time) return null;

  switch (repeat) {
    case "weekly":
      return <span>{t("everyWeekAt", { time })}</span>;
    case "monthly":
      return <span>{t("everyMonthAt", { time })}</span>;
    case "once":
      return <span>{t("onceAt", { time })}</span>;
    case "daily":
    default:
      return <span>{t("everyDayAt", { time })}</span>;
  }
}
