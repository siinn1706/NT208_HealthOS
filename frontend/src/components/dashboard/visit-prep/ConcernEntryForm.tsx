"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import type { ConcernCategory, DurationUnit, SymptomEntry } from "@/types/api";
import { cn } from "@/lib/utils";

const CATEGORIES: ConcernCategory[] = [
  "pain",
  "fever",
  "gi",
  "resp",
  "mental",
  "skin",
  "neuro",
  "cardio",
  "other",
];

const DURATION_UNITS: DurationUnit[] = ["hours", "days", "weeks", "months"];
const subscribeToTodaySnapshot = () => () => {};
const getTodaySnapshot = () => new Date().toISOString().slice(0, 10);
const getServerTodaySnapshot = () => undefined;

export type ConcernDraft = Pick<
  SymptomEntry,
  | "concern_text"
  | "concern_category"
  | "onset_date"
  | "duration_value"
  | "duration_unit"
  | "severity_0_10"
  | "triggers"
  | "better_with"
  | "worse_with"
  | "meds_taken"
  | "prior_care"
> & { id?: string };

interface Props {
  index: number;
  value: ConcernDraft;
  onChange: (next: ConcernDraft) => void;
  onRemove?: () => void;
  removable?: boolean;
  disabled?: boolean;
}

export function ConcernEntryForm({
  index,
  value,
  onChange,
  onRemove,
  removable,
  disabled,
}: Props) {
  const t = useTranslations("dashboard.visitPrep.concernForm");
  const tCat = useTranslations("dashboard.visitPrep.concernCategories");
  const tDur = useTranslations("dashboard.visitPrep.durationUnits");
  const todayIso = useSyncExternalStore(
    subscribeToTodaySnapshot,
    getTodaySnapshot,
    getServerTodaySnapshot,
  );

  const update = <K extends keyof ConcernDraft>(key: K, next: ConcernDraft[K]) =>
    onChange({ ...value, [key]: next });

  // Review fix T3: severity is null until the user explicitly sets it.
  // Auto-defaulting to 5 silently biased the engine — every untouched form
  // tripped `rt-persistent-moderate` and never reached `ur-acute-severe-pain`.
  // We keep the slider visually centred at 5 but only persist a value once
  // the user interacts; the engine ignores `null` severity in its rules.
  const isSet = value.severity_0_10 != null;
  const sev = value.severity_0_10 ?? 5;
  const sevAnchor = !isSet
    ? t("severityNotSet")
    : sev <= 2
      ? t("severityAnchorLow")
      : sev <= 6
        ? t("severityAnchorMid")
        : t("severityAnchorHigh");

  return (
    <fieldset
      disabled={disabled}
      className="rounded-xl border border-border bg-card p-4 space-y-4 disabled:opacity-60"
    >
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        #{index + 1}
      </legend>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">
          {t("concernText")}
          <span aria-hidden className="ml-0.5 text-destructive">
            *
          </span>
        </label>
        <textarea
          aria-label={t("concernText")}
          value={value.concern_text}
          onChange={(e) => update("concern_text", e.target.value)}
          placeholder={t("concernTextPlaceholder")}
          rows={2}
          maxLength={500}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">{t("category")}</label>
          <select
            aria-label={t("category")}
            value={value.concern_category}
            onChange={(e) =>
              update("concern_category", e.target.value as ConcernCategory)
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tCat(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">{t("onsetDate")}</label>
          <input
            type="date"
            aria-label={t("onsetDate")}
            value={value.onset_date ?? ""}
            onChange={(e) => update("onset_date", e.target.value || null)}
            max={todayIso}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">{t("duration")}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              aria-label={t("durationValue")}
              min={0}
              value={value.duration_value ?? ""}
              onChange={(e) =>
                update(
                  "duration_value",
                  e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                )
              }
              placeholder={t("durationValue")}
              className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <select
              aria-label={t("durationUnit")}
              value={value.duration_unit ?? ""}
              onChange={(e) =>
                update("duration_unit", (e.target.value || null) as DurationUnit | null)
              }
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">{t("durationUnit")}</option>
              {DURATION_UNITS.map((u) => (
                <option key={u} value={u}>
                  {tDur(u)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            className="text-xs font-medium text-foreground"
            id={`sev-label-${index}`}
          >
            {isSet ? t("severity", { value: sev }) : t("severityNotSet")}
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={sev}
            onChange={(e) =>
              update("severity_0_10", Math.max(0, Math.min(10, Number(e.target.value))))
            }
            onClick={() => {
              // Tapping the track without dragging still counts as user intent;
              // commit the rendered value so the bias-prevention logic applies.
              if (!isSet) update("severity_0_10", sev);
            }}
            aria-labelledby={`sev-label-${index}`}
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={isSet ? sev : undefined}
            aria-valuetext={
              isSet ? `${sev} of 10 — ${sevAnchor}` : t("severityNotSet")
            }
            className={cn(
              "w-full accent-primary",
              !isSet && "opacity-60",
            )}
          />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {sevAnchor}
            {!isSet && (
              <span className="ml-1 normal-case text-muted-foreground/80">
                · {t("severityHint")}
              </span>
            )}
          </p>
        </div>
      </div>

      <details className="rounded-md border border-dashed border-border px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-foreground/80">
          {t("triggers")} · {t("betterWith")} · {t("worseWith")}
        </summary>
        <div className="mt-3 space-y-3">
          {(["triggers", "better_with", "worse_with"] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {t(field === "triggers" ? "triggers" : field === "better_with" ? "betterWith" : "worseWith")}
              </label>
              <input
                type="text"
                aria-label={t(field === "triggers" ? "triggers" : field === "better_with" ? "betterWith" : "worseWith")}
                value={value[field] ?? ""}
                onChange={(e) => update(field, e.target.value || null)}
                placeholder={t(
                  field === "triggers"
                    ? "triggersPlaceholder"
                    : field === "better_with"
                      ? "betterWithPlaceholder"
                      : "worseWithPlaceholder",
                )}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          ))}
        </div>
      </details>

      <details className="rounded-md border border-dashed border-border px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-foreground/80">
          {t("medsTaken")} · {t("priorCare")}
        </summary>
        <div className="mt-3 space-y-3">
          {(["meds_taken", "prior_care"] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {t(field === "meds_taken" ? "medsTaken" : "priorCare")}
              </label>
              <textarea
                aria-label={t(field === "meds_taken" ? "medsTaken" : "priorCare")}
                value={value[field] ?? ""}
                onChange={(e) => update(field, e.target.value || null)}
                rows={2}
                placeholder={t(
                  field === "meds_taken" ? "medsTakenPlaceholder" : "priorCarePlaceholder",
                )}
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none",
                )}
              />
            </div>
          ))}
        </div>
      </details>

      {removable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-medium text-destructive inline-flex items-center gap-1.5 hover:underline"
        >
          <Trash2 className="size-3.5" /> Remove
        </button>
      )}
    </fieldset>
  );
}
