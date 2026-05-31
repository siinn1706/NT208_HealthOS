"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Clock, Pill, Calendar, Dumbbell } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { DataState } from "@/components/ui/data-state";
import type { DataSlice } from "@/types/data-slice";

export interface Reminder {
  id: string;
  type: "medicine" | "appointment" | "exercise";
  title: string;
  time: string;
  done?: boolean;
}

interface UpcomingRemindersWidgetProps {
  /**
   * Data slice from `getUpcomingReminders()`. Using a slice (rather than a
   * raw array) lets the widget surface the difference between an empty list
   * and a failed fetch — the previous shape collapsed both into "no items",
   * which hid real network/auth failures from the user. (UX plan §G.)
   */
  reminders: DataSlice<Reminder[]>;
  /** Stretch to fill remaining column height (dashboard layout). */
  fill?: boolean;
}

const TYPE_CONFIG = {
  medicine: {
    icon: Pill,
    color: "text-[#E7DEA7]",
    bg: "bg-[#E7DEA7]/10",
  },
  appointment: {
    icon: Calendar,
    color: "text-[#41BCE6]",
    bg: "bg-[#41BCE6]/10",
  },
  exercise: {
    icon: Dumbbell,
    color: "text-[#E8BDB7]",
    bg: "bg-[#E8BDB7]/10",
  },
};

export function UpcomingRemindersWidget({ reminders, fill = false }: UpcomingRemindersWidgetProps) {
  const t = useTranslations("dashboard.reminders");
  const tTypes = useTranslations("dashboard.reminders.types");
  const [items, setItems] = useState<Reminder[]>(reminders.data ?? []);

  /**
   * Mark a reminder done with an optimistic update. We flip the local copy
   * first so the UI feels instant, then PATCH the server. If the server
   * rejects the change we roll back and surface a toast — earlier versions
   * silently lost the user's tap, leaving the reminder unmarked but visually
   * crossed-out (a credibility hit per UX plan §G).
   */
  const ack = async (id: string) => {
    const previous = items;
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, done: true } : r)));

    try {
      const res = await fetch(`/api/v1/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
      });
      if (!res.ok) {
        throw new Error(`HTTP_${res.status}`);
      }
    } catch {
      setItems(previous);
      toast.error(t("ackFailed"));
    }
  };

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card",
      fill ? "h-full flex flex-col min-h-0" : "shrink-0",
    )}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border shrink-0">
        <p className="text-sm font-semibold text-foreground">{t("title")}</p>
        <Clock className="size-4 text-muted-foreground" />
      </div>

      <div className={cn(
        "overflow-y-auto",
        fill ? "flex-1 min-h-0" : "max-h-[320px]",
      )}>
        <DataState
          // Once the user has started ack'ing items, `items` is the source of
          // truth for the rendered list — re-derive a success slice so the
          // empty/error chrome stays consistent with the source.
          slice={
            items.length > 0
              ? {
                  status: "success",
                  data: items,
                  meta: reminders.meta,
                  error: reminders.error,
                }
              : reminders
          }
          empty={
            <div className="px-5 py-6 text-sm text-muted-foreground text-center">
              {t("empty")}
            </div>
          }
          recoverableError={
            <div className="px-5 py-6 flex flex-col items-center gap-1.5 text-center">
              <p className="text-sm font-medium text-foreground">
                {t("loadErrorTitle")}
              </p>
              <p className="text-xs text-muted-foreground max-w-[240px]">
                {reminders.error?.message ?? t("loadErrorBody")}
              </p>
            </div>
          }
          minHeight={fill ? 0 : 120}
        >
          {(list) => (
            <ul className="divide-y divide-border">
              {list.map((r) => {
                const cfg = TYPE_CONFIG[r.type];
                const Icon = cfg.icon;
                return (
                  <li
                    key={r.id}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3.5",
                      r.done && "opacity-50",
                    )}
                  >
                    <div
                      className={cn(
                        "size-8 rounded-full flex items-center justify-center flex-shrink-0",
                        cfg.bg,
                      )}
                    >
                      <Icon className={cn("size-4", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium text-foreground truncate",
                          r.done && "line-through",
                        )}
                      >
                        {r.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {tTypes(r.type as Parameters<typeof tTypes>[0])} · {r.time}
                      </p>
                    </div>
                    {!r.done && (
                      <button type="button"
                        onClick={() => ack(r.id)}
                        aria-label={t("ack")}
                        className={cn(
                          "flex-shrink-0 size-7 rounded-full border border-border",
                          "flex items-center justify-center",
                          "hover:bg-primary hover:border-primary hover:text-primary-foreground",
                          "transition-colors duration-200 cursor-pointer text-muted-foreground",
                        )}
                      >
                        <Check className="size-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </DataState>
      </div>
    </div>
  );
}
