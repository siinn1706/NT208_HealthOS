"use client";

import { useState } from "react";
import { Clock4, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SnoozeMenuProps {
  reminderId: string;
  /** Called after a successful snooze so the parent can update local UI. */
  onSnoozed?: (until: Date) => void;
  className?: string;
}

interface PresetEntry {
  key: string;
  minutes: number;
  label: string;
}

/**
 * Snooze action menu (10m / 30m / 1h / until tomorrow morning).
 *
 * Hooks into `POST /api/v1/reminders/{id}/snooze` (B7 P5 implements both BFF
 * and Core). The "until tomorrow" preset shows the actual wake time so the
 * user knows what they're picking — defaults to 08:00 in the local timezone
 * (configurable via the `wakeHour` prop or `users.preferences.wake_time`
 * once Core exposes it).
 */
const DEFAULT_WAKE_HOUR = 8;

export function SnoozeMenu({ reminderId, onSnoozed, className }: SnoozeMenuProps) {
  const t = useTranslations("dashboard.reminders.snooze");
  const [busy, setBusy] = useState(false);

  const wakeHour = DEFAULT_WAKE_HOUR;
  const tomorrowAt = nextMorning(wakeHour);
  const tomorrowLabel = tomorrowAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const presets: PresetEntry[] = [
    { key: "tenMin", minutes: 10, label: t("tenMin") },
    { key: "thirtyMin", minutes: 30, label: t("thirtyMin") },
    { key: "oneHour", minutes: 60, label: t("oneHour") },
    {
      key: "untilTomorrow",
      minutes: Math.max(
        60,
        Math.round((tomorrowAt.getTime() - Date.now()) / 60_000),
      ),
      label: t("untilTomorrowAt", { time: tomorrowLabel }),
    },
  ];

  const handlePick = async (minutes: number) => {
    if (busy) return;
    const until = new Date(Date.now() + minutes * 60_000);
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/reminders/${reminderId}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ until: until.toISOString() }),
      });
      if (!res.ok) throw new Error("snooze failed");
      onSnoozed?.(until);
      toast.success(
        t("snoozedUntil", {
          time: until.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        }),
      );
    } catch {
      toast.error(t("failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("label")}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer",
          className,
        )}
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Clock4 className="w-3.5 h-3.5" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {presets.map((p) => (
          <DropdownMenuItem
            key={p.key}
            disabled={busy}
            onSelect={(e) => {
              e.preventDefault();
              void handlePick(p.minutes);
            }}
          >
            {p.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function nextMorning(hour: number): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hour, 0, 0, 0);
  return tomorrow;
}
