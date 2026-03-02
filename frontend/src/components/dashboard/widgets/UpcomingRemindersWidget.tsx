"use client";

import { useTranslations } from "next-intl";
import { Check, Clock, Pill, Calendar, Dumbbell } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Reminder {
  id: string;
  type: "medicine" | "appointment" | "exercise";
  title: string;
  time: string;
  done?: boolean;
}

interface UpcomingRemindersWidgetProps {
  reminders: Reminder[];
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

export function UpcomingRemindersWidget({
  reminders: initial,
}: UpcomingRemindersWidgetProps) {
  const t = useTranslations("dashboard.reminders");
  const tTypes = useTranslations("dashboard.reminders.types");
  const [items, setItems] = useState<Reminder[]>(initial);

  const ack = (id: string) =>
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, done: true } : r))
    );

  return (
    <div className="rounded-xl border border-border bg-card h-full">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
        <p className="text-sm font-semibold text-foreground">{t("title")}</p>
        <Clock className="w-4 h-4 text-muted-foreground" />
      </div>

      <ul className="divide-y divide-border overflow-y-auto max-h-[320px]">
        {items.length === 0 ? (
          <li className="px-5 py-6 text-sm text-muted-foreground text-center">
            {t("empty")}
          </li>
        ) : (
          items.map((r) => {
            const cfg = TYPE_CONFIG[r.type];
            const Icon = cfg.icon;
            return (
              <li
                key={r.id}
                className={cn(
                  "flex items-center gap-3 px-5 py-3.5",
                  r.done && "opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    cfg.bg
                  )}
                >
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium text-foreground truncate",
                      r.done && "line-through"
                    )}
                  >
                    {r.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {tTypes(r.type as Parameters<typeof tTypes>[0])} · {r.time}
                  </p>
                </div>
                {!r.done && (
                  <button
                    onClick={() => ack(r.id)}
                    aria-label={t("ack")}
                    className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-full border border-border",
                      "flex items-center justify-center",
                      "hover:bg-primary hover:border-primary hover:text-primary-foreground",
                      "transition-colors duration-200 cursor-pointer text-muted-foreground"
                    )}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
