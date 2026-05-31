"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/navigation";
import { Pill, CheckCircle2, Clock, Bell } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { MedicationDose } from "@/types/api";

interface TodayDosesPanelProps {
  /** Render at most N entries (compact dashboard variant). Ignored when `fill`. */
  limit?: number;
  /** Hide the header / "view all" link when used inline on the Hub itself. */
  variant?: "card" | "inline";
  /** Stretch to fill remaining column height (dashboard layout). */
  fill?: boolean;
}

/**
 * Compact today panel — used on `/dashboard` (limit=3) and as the top section
 * of the Hub (`limit` undefined). Marking a dose done reuses the existing
 * `/api/v1/reminders/{id}/done` endpoint so all firing semantics stay in one
 * place.
 */
export function TodayDosesPanel({ limit, variant = "card", fill = false }: TodayDosesPanelProps) {
  const t = useTranslations("dashboard.medications");
  const locale = useLocale();
  const [doses, setDoses] = React.useState<MedicationDose[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  const fetchDoses = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const tzid =
        (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
        "Asia/Ho_Chi_Minh";
      const search = new URLSearchParams({ tzid });
      const res = await fetch(`/api/v1/medications/today?${search.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const json = await res.json().catch(() => null);
      const list = Array.isArray(json?.data) ? (json.data as MedicationDose[]) : [];
      setDoses(list);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchDoses();
  }, [fetchDoses]);

  const visible = React.useMemo(() => {
    if (fill) return doses;
    return typeof limit === "number" ? doses.slice(0, limit) : doses;
  }, [doses, limit, fill]);

  const done = doses.filter((d) => d.status === "done").length;
  const pending = doses.length - done;

  // Per-occurrence rollback (review M1). The previous implementation
  // snapshot the entire `doses` array, so a failure on dose A while dose B
  // was already optimistically flipped would wipe B's update on rollback.
  // We now revert ONLY the failing occurrence (functional update keyed by
  // `occurrence_id`), preserving every other in-flight optimistic change.
  const markDone = React.useCallback(
    async (dose: MedicationDose) => {
      const previousStatus = dose.status;
      setBusy(dose.occurrence_id);
      setDoses((prev) =>
        prev.map((d) =>
          d.occurrence_id === dose.occurrence_id ? { ...d, status: "done" } : d,
        ),
      );
      try {
        const res = await fetch(
          `/api/v1/reminders/${encodeURIComponent(dose.reminder_id)}/done`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ occurrence_id: dose.occurrence_id }),
          },
        );
        if (!res.ok) throw new Error("done failed");
      } catch {
        setDoses((prev) =>
          prev.map((d) =>
            d.occurrence_id === dose.occurrence_id
              ? { ...d, status: previousStatus }
              : d,
          ),
        );
        toast.error(t("todayMarkError"));
      } finally {
        setBusy(null);
      }
    },
    [t],
  );

  const containerClass =
    variant === "card"
      ? cn(
          "rounded-xl border border-border bg-card overflow-hidden",
          fill ? "h-full flex flex-col min-h-0" : "shrink-0",
        )
      : "rounded-xl border border-border bg-background";

  const listBody = loading ? (
    <div className="divide-y divide-border">
      {Array.from({ length: fill ? 5 : 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  ) : error ? (
    <div className="flex items-center gap-2.5 px-5 py-3.5 text-muted-foreground">
      <Bell className="size-4 opacity-40 flex-shrink-0" />
      <p className="text-xs">{t("todayLoadError")}</p>
    </div>
  ) : visible.length === 0 ? (
    <div className={cn(
      "flex items-center gap-2.5 px-5 py-3.5 text-muted-foreground",
      fill && "flex-1",
    )}>
      <Pill className="size-4 opacity-40 flex-shrink-0" />
      <p className="text-xs">{t("todayEmpty")}</p>
    </div>
  ) : (
    <ul className="divide-y divide-border">
      {visible.map((d) => {
        const isDone = d.status === "done";
        const time = new Date(d.scheduled_at).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <li
            key={d.occurrence_id}
            className={cn(
              "flex items-center gap-3 px-5 py-3 transition-colors",
              isDone && "opacity-60",
            )}
          >
            <div
              className="flex-shrink-0 size-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(231, 222, 167, 0.18)" }}
              aria-hidden
            >
              <Pill className="size-4" style={{ color: "#C9A95A" }} />
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={
                  `/dashboard/medications/${d.medication_plan_id}` as never
                }
                className={cn(
                  "text-sm font-medium text-foreground hover:underline",
                  isDone && "line-through",
                )}
              >
                {d.plan_name}
                {d.strength && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {d.strength}
                  </span>
                )}
              </Link>
              <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden />
                {time}
              </p>
            </div>
            <button
              type="button"
              onClick={() => markDone(d)}
              disabled={isDone || busy === d.occurrence_id}
              aria-label={isDone ? t("todayMarkedAria") : t("todayMarkAria")}
              className={cn(
                "flex-shrink-0 size-8 rounded-lg flex items-center justify-center transition-colors",
                isDone
                  ? "text-muted-foreground"
                  : "text-emerald-500 hover:bg-emerald-500/10 cursor-pointer",
              )}
            >
              <CheckCircle2 className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className={containerClass} aria-label={t("today")}>
      <header className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border shrink-0">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("today")}</p>
          {!loading && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("todayDone", { n: done })} · {t("todayPending", { n: pending })}
            </p>
          )}
        </div>
        {(fill ? doses.length > 0 : typeof limit === "number" && doses.length > limit) && (
          <Link
            href={"/dashboard/medications" as never}
            className="text-xs text-primary hover:underline"
          >
            {t("todayViewAll")} →
          </Link>
        )}
      </header>

      <div className={cn(fill && "flex-1 min-h-0 overflow-y-auto")}>
        {listBody}
      </div>
    </section>
  );
}
