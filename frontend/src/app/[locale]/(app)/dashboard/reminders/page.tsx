"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Stethoscope,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  AddReminderDialog,
  type Reminder,
  type ReminderRepeat,
} from "@/components/dashboard/reminders/AddReminderDialog";
import { NotificationPermissionBanner } from "@/components/dashboard/reminders/NotificationPermissionBanner";
import { RecurringExplanation } from "@/components/dashboard/reminders/RecurringExplanation";
import { SnoozeMenu } from "@/components/dashboard/reminders/SnoozeMenu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type FilterType = "all" | "medicine" | "appointment" | "exercise";
type StateTab = "today" | "upcoming" | "missed" | "completed" | "all";

const STATE_TABS: StateTab[] = ["today", "upcoming", "missed", "completed", "all"];
const FILTER_TYPES: FilterType[] = ["all", "medicine", "appointment", "exercise"];

async function fetchReminders(params: { type?: FilterType; state?: StateTab }): Promise<{
  ok: boolean;
  data: Reminder[];
}> {
  const search = new URLSearchParams();
  if (params.type && params.type !== "all") search.set("type", params.type);
  if (params.state && params.state !== "all") search.set("state", params.state);
  const qs = search.toString();
  try {
    const res = await fetch(`/api/v1/reminders${qs ? `?${qs}` : ""}`);
    if (!res.ok) return { ok: false, data: [] };
    const json = await res.json().catch(() => null);
    if (Array.isArray(json?.data)) return { ok: true, data: json.data };
    return { ok: true, data: [] };
  } catch {
    return { ok: false, data: [] };
  }
}

// B7 P5 — today tab is server-driven via the occurrences endpoint.
type OccurrenceFromApi = {
  id: string;
  reminder_id: string;
  title: string;
  type: "medicine" | "appointment" | "exercise";
  scheduled_at: string;
  status: string;
};

async function fetchTodayOccurrences(filterType?: FilterType): Promise<{
  ok: boolean;
  data: Reminder[];
}> {
  const tzid =
    (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
    "Asia/Ho_Chi_Minh";
  const search = new URLSearchParams({ today: "true", tzid });
  try {
    const res = await fetch(`/api/v1/reminders/occurrences?${search.toString()}`);
    if (!res.ok) return { ok: false, data: [] };
    const json = await res.json().catch(() => null);
    const list: OccurrenceFromApi[] = Array.isArray(json?.data) ? json.data : [];
    // Map occurrences → the legacy `Reminder` shape the rest of the page expects.
    const reminders: Reminder[] = list
      .filter((o) => !filterType || filterType === "all" || o.type === filterType)
      .map((o) => {
        const dt = new Date(o.scheduled_at);
        const hh = String(dt.getHours()).padStart(2, "0");
        const mm = String(dt.getMinutes()).padStart(2, "0");
        return {
          // Use the parent reminder id for skip/snooze actions; keep occurrence
          // id available via the spread for future per-occurrence actions.
          id: o.reminder_id,
          type: o.type,
          title: o.title,
          time: `${hh}:${mm}`,
          repeat: "once",
          done: o.status === "done",
        };
      });
    return { ok: true, data: reminders };
  } catch {
    return { ok: false, data: [] };
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function classifyClientSide(reminders: Reminder[], tab: StateTab): Reminder[] {
  if (tab === "all") return reminders;
  const now = new Date();
  const todayMinutes = now.getHours() * 60 + now.getMinutes();

  return reminders.filter((r) => {
    if (tab === "completed") return r.done;
    if (r.done) return false;

    const [hh, mm] = r.time.split(":").map((n) => parseInt(n, 10));
    const reminderMinutes =
      Number.isFinite(hh) && Number.isFinite(mm) ? hh * 60 + mm : 0;

      if (tab === "today") {
        if (r.repeat !== "once") return true;
        const next = (r as unknown as Record<string, unknown>).nextOccurrenceAt;
        if (typeof next === "string") return isSameDay(new Date(next), now);
        return false;
      }
    if (tab === "upcoming") return reminderMinutes > todayMinutes;
    if (tab === "missed") return reminderMinutes <= todayMinutes;
    return true;
  });
}

export default function RemindersPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialState = (searchParams.get("state") as StateTab) ?? "today";
  const initialType = (searchParams.get("type") as FilterType) ?? "all";

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>(initialType);
  const [stateTab, setStateTab] = useState<StateTab>(initialState);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Reminder | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorState(null);
    const loader =
      stateTab === "today"
        ? fetchTodayOccurrences(filter)
        : fetchReminders({ type: filter, state: stateTab });
    loader.then((r) => {
      if (cancelled) return;
      if (!r.ok) setErrorState(t("reminders.loadErrorBody"));
      setReminders(r.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [filter, stateTab, t, refreshKey]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (stateTab === "today") next.delete("state");
    else next.set("state", stateTab);
    if (filter === "all") next.delete("type");
    else next.set("type", filter);
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [filter, stateTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDone = async (id: string) => {
    const reminder = reminders.find((r) => r.id === id);
    if (!reminder) return;

    const previous = reminders;
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, done: !r.done } : r)),
    );
    try {
      const res = await fetch(`/api/v1/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !reminder.done }),
      });
      if (!res.ok) throw new Error("BFF failed");
    } catch {
      setReminders(previous);
    }
  };

  const deleteReminder = async (id: string) => {
    const previous = reminders;
    setReminders((prev) => prev.filter((r) => r.id !== id));
    setPendingDelete(null);
    try {
      const res = await fetch(`/api/v1/reminders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("BFF failed");
    } catch {
      setReminders(previous);
    }
  };

  const skipOccurrence = async (id: string) => {
    setPendingDelete(null);
    try {
      await fetch(`/api/v1/reminders/${id}/skip`, { method: "POST" });
    } finally {
      setRefreshKey((k) => k + 1);
    }
  };

  const handleAddReminder = (reminder: Reminder) => {
    setReminders((prev) => [reminder, ...prev]);
  };

  const displayed = useMemo(
    () => classifyClientSide(reminders, stateTab),
    [reminders, stateTab],
  );

  const pending = reminders.filter((r) => !r.done).length;
  const done = reminders.filter((r) => r.done).length;

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { icon: typeof Pill; color: string; label: string }> = {
      medicine:    { icon: Pill,        color: "#E7DEA7", label: t("reminders.types.medicine") },
      appointment: { icon: Calendar,    color: "#41BCE6", label: t("reminders.types.appointment") },
      exercise:    { icon: Dumbbell,    color: "#E8BDB7", label: t("reminders.types.exercise") },
    };
    return configs[type] || configs.medicine;
  };

  return (
    <>
      <PageHeader
        title={t("reminders.pageTitle")}
        description={t("reminders.pageSubtitle")}
        primaryAction={
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            aria-label={t("reminders.addReminder")}
          >
            <Plus className="w-4 h-4" />
            {t("reminders.addReminder")}
          </button>
        }
      />
      <div className="max-w-[1400px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <NotificationPermissionBanner />

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          {loading ? (
            <>
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </>
          ) : (
            [
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
            ))
          )}
        </div>

        {/* State tabs */}
        <Tabs value={stateTab} onValueChange={(v) => setStateTab(v as StateTab)}>
          <TabsList variant="line" className="flex-wrap">
            {STATE_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`reminders.tabs.${tab}` as Parameters<typeof t>[0])}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Type filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_TYPES.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {f === "all" ? (
                <>
                  <Bell className="w-3 h-3" />
                  {t("reminders.filterAll")}
                </>
              ) : (
                (() => {
                  const cfg = getTypeConfig(f);
                  const Icon = cfg.icon;
                  return (
                    <>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </>
                  );
                })()
              )}
            </button>
          ))}
        </div>

        {/* Reminders list */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3 rounded" />
                    <Skeleton className="h-3 w-1/3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : errorState ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2 px-6">
              <Bell className="w-8 h-8 opacity-40" />
              <p className="text-sm font-medium">{t("reminders.loadErrorTitle")}</p>
              <p className="text-xs max-w-sm">{errorState}</p>
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Bell className="w-8 h-8 opacity-40" />
              <p className="text-sm">{t("reminders.empty")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {displayed.map((r) => {
                const cfg = getTypeConfig(r.type);
                const Icon = cfg.icon;
                const isAppointmentLinked = Boolean(r.appointment_id);
                // Plan-owned reminders surface a small chip linking to the
                // medication detail (review P3-linked-chip). The DTO field
                // arrives in either camelCase or snake_case depending on
                // where the row was hydrated; check both for safety.
                const linkedPlanId =
                  (r as unknown as { medication_plan_id?: string | null })
                    .medication_plan_id ??
                  (r as unknown as { medicationPlanId?: string | null })
                    .medicationPlanId ??
                  null;
                return (
                  <li
                    key={r.id}
                    className={cn(
                      "flex items-start gap-4 px-5 py-4 transition-colors",
                      r.done && "opacity-50",
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={cn(
                            "text-sm font-medium text-foreground",
                            r.done && "line-through",
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
                        {isAppointmentLinked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-primary/40 text-primary inline-flex items-center gap-1">
                            <Stethoscope className="w-2.5 h-2.5" />
                            {t("reminders.appointmentLinked")}
                          </span>
                        )}
                        {linkedPlanId && (
                          <a
                            href={`/dashboard/medications/${linkedPlanId}`}
                            className="text-[10px] px-1.5 py-0.5 rounded-full border border-warm-gold/40 text-warm-gold inline-flex items-center gap-1 hover:bg-warm-gold/10 transition-colors"
                          >
                            <Pill className="w-2.5 h-2.5" />
                            {t("reminders.medicationLinked")}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {r.time}
                        </span>
                        {r.repeat && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Repeat className="w-3 h-3" />
                            <RecurringExplanation
                              repeat={r.repeat as ReminderRepeat}
                              time={r.time}
                            />
                          </span>
                        )}
                      </div>
                      {r.note && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{r.note}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                      {!r.done && <SnoozeMenu reminderId={r.id} onSnoozed={() => setRefreshKey((k) => k + 1)} />}
                      <button
                        onClick={() => toggleDone(r.id)}
                        aria-label={t("reminders.ack")}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                          r.done
                            ? "text-muted-foreground hover:bg-muted"
                            : "text-green-500 hover:bg-green-500/10",
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPendingDelete(r)}
                        aria-label={t("reminders.deleteLabel")}
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

        {/* Add Reminder Dialog */}
        <AddReminderDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onAdd={handleAddReminder}
        />

        {/* Delete / Skip confirmation */}
        <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingDelete?.repeat !== "once"
                  ? t("reminders.deleteOrSkipTitle")
                  : t("reminders.deleteConfirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDelete?.repeat !== "once"
                  ? t("reminders.deleteOrSkipBody")
                  : t("reminders.deleteConfirmBody")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("reminders.cancelDelete")}</AlertDialogCancel>
              {pendingDelete?.repeat !== "once" && (
                <Button
                  variant="outline"
                  onClick={() => pendingDelete && skipOccurrence(pendingDelete.id)}
                >
                  {t("reminders.skipOccurrence")}
                </Button>
              )}
              <AlertDialogAction
                variant="destructive"
                onClick={() => pendingDelete && deleteReminder(pendingDelete.id)}
              >
                {t("reminders.deleteEntire")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
