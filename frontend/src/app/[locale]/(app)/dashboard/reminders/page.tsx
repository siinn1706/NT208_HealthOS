"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Plus,
  Pill,
  Calendar,
  Dumbbell,
  CheckCircle2,
  Clock,
  Repeat,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Reminder {
  id: string;
  type: "medicine" | "appointment" | "exercise";
  title: string;
  time: string;
  repeat?: "daily" | "weekly" | "once";
  done: boolean;
  note?: string;
}

const INITIAL_REMINDERS: Reminder[] = [
  {
    id: "r-1",
    type: "medicine",
    title: "Metformin 500mg",
    time: "08:00",
    repeat: "daily",
    done: false,
    note: "Uống sau bữa sáng",
  },
  {
    id: "r-2",
    type: "appointment",
    title: "Khám định kỳ - BS. Nguyễn Minh",
    time: "10:30",
    repeat: "once",
    done: false,
    note: "Phòng khám 3, tầng 2",
  },
  {
    id: "r-3",
    type: "exercise",
    title: "Bài tập cardio 30 phút",
    time: "17:00",
    repeat: "daily",
    done: false,
  },
  {
    id: "r-4",
    type: "medicine",
    title: "Vitamin D3 1000IU",
    time: "20:00",
    repeat: "daily",
    done: false,
    note: "Uống sau bữa tối",
  },
  {
    id: "r-5",
    type: "appointment",
    title: "Xét nghiệm máu định kỳ",
    time: "09:00",
    repeat: "once",
    done: true,
    note: "Nhịn ăn 8 tiếng trước",
  },
];

const TYPE_CONFIG = {
  medicine: {
    icon: Pill,
    color: "#E7DEA7",
    label: "Thuốc",
    filterLabel: "Thuốc",
  },
  appointment: {
    icon: Calendar,
    color: "#41BCE6",
    label: "Lịch khám",
    filterLabel: "Lịch khám",
  },
  exercise: {
    icon: Dumbbell,
    color: "#E8BDB7",
    label: "Tập luyện",
    filterLabel: "Tập luyện",
  },
};

type FilterType = "all" | "medicine" | "appointment" | "exercise";

export default function RemindersPage() {
  const t = useTranslations("dashboard");
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
  const [filter, setFilter] = useState<FilterType>("all");

  const toggleDone = (id: string) =>
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));

  const deleteReminder = (id: string) =>
    setReminders((prev) => prev.filter((r) => r.id !== id));

  const displayed =
    filter === "all" ? reminders : reminders.filter((r) => r.type === filter);

  const pending = reminders.filter((r) => !r.done).length;
  const done = reminders.filter((r) => r.done).length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("reminders.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("reminders.pageSubtitle")}
          </p>
        </div>
        <button
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          aria-label={t("reminders.addReminder")}
        >
          <Plus className="w-4 h-4" />
          {t("reminders.addReminder")}
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("reminders.pending"), value: pending, color: "#41BCE6" },
          { label: t("reminders.done"), value: done, color: "#34D399" },
          { label: t("reminders.total"), value: reminders.length, color: "#A78BFA" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "medicine", "appointment", "exercise"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors cursor-pointer",
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {f === "all" ? (
              <>
                <Bell className="w-3 h-3" />
                {t("reminders.filterAll")}
              </>
            ) : (
              (() => {
                const cfg = TYPE_CONFIG[f];
                const Icon = cfg.icon;
                return (
                  <>
                    <Icon className="w-3 h-3" />
                    {cfg.filterLabel}
                  </>
                );
              })()
            )}
          </button>
        ))}
      </div>

      {/* Reminders list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Bell className="w-8 h-8 opacity-40" />
            <p className="text-sm">{t("reminders.empty")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {displayed.map((r) => {
              const cfg = TYPE_CONFIG[r.type];
              const Icon = cfg.icon;
              return (
                <li
                  key={r.id}
                  className={cn(
                    "flex items-start gap-4 px-5 py-4 transition-colors",
                    r.done && "opacity-50"
                  )}
                >
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
                    style={{ background: `${cfg.color}20` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-sm font-medium text-foreground",
                          r.done && "line-through"
                        )}
                      >
                        {r.title}
                      </p>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full border"
                        style={{ color: cfg.color, borderColor: `${cfg.color}40` }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {r.time}
                      </span>
                      {r.repeat && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Repeat className="w-3 h-3" />
                          {t(`reminders.repeatLabels.${r.repeat}` as Parameters<typeof t>[0])}
                        </span>
                      )}
                    </div>
                    {r.note && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{r.note}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                    <button
                      onClick={() => toggleDone(r.id)}
                      aria-label={r.done ? t("reminders.ack") : t("reminders.ack")}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                        r.done
                          ? "text-muted-foreground hover:bg-muted"
                          : "text-green-500 hover:bg-green-500/10"
                      )}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteReminder(r.id)}
                      aria-label="delete"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
