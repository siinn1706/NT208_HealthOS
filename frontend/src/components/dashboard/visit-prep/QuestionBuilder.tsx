"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ConcernCategory,
  QuestionItem,
  QuestionTemplate,
  VisitType,
} from "@/types/api";
import { getSuggestedQuestions } from "./VisitPrepApi";

const MAX_QUESTIONS = 10;

interface Props {
  briefId: string;
  visitType: VisitType;
  concernCategories: ConcernCategory[];
  value: QuestionItem[];
  onChange: (next: QuestionItem[]) => void;
  disabled?: boolean;
}

export function QuestionBuilder({
  briefId,
  visitType,
  concernCategories,
  value,
  onChange,
  disabled,
}: Props) {
  const t = useTranslations("dashboard.visitPrep.questions");
  const locale = useLocale();
  const [suggestions, setSuggestions] = useState<QuestionTemplate[]>([]);
  const [customText, setCustomText] = useState("");

  // Concern category influences suggestions: pick the first one as the
  // primary lens, but also fall through to no-category suggestions.
  const primaryCategory = concernCategories[0];

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await getSuggestedQuestions(briefId, {
          visitType,
          concernCategory: primaryCategory,
        });
        if (!cancelled) setSuggestions(rows);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [briefId, visitType, primaryCategory]);

  const selectedSlugs = useMemo(
    () => new Set(value.filter((q) => q.source === "template").map((q) => q.id)),
    [value],
  );

  const renderText = (item: { text_vi: string; text_en: string }) =>
    locale === "vi" ? item.text_vi : item.text_en;

  function addTemplate(tpl: QuestionTemplate) {
    if (value.length >= MAX_QUESTIONS) return;
    if (selectedSlugs.has(tpl.slug)) return;
    onChange([
      ...value,
      {
        id: tpl.slug,
        source: "template",
        text_vi: tpl.text_vi,
        text_en: tpl.text_en,
        order: value.length,
        locked: tpl.is_canonical,
      },
    ]);
  }

  function addCustom() {
    const text = customText.trim();
    if (!text) return;
    if (value.length >= MAX_QUESTIONS) return;
    onChange([
      ...value,
      {
        id: `custom-${Date.now()}`,
        source: "custom",
        text_vi: text,
        text_en: text,
        order: value.length,
        locked: false,
      },
    ]);
    setCustomText("");
  }

  function remove(id: string) {
    const next = value
      .filter((q) => !(q.id === id && !q.locked))
      .map((q, idx) => ({ ...q, order: idx }));
    onChange(next);
  }

  const isFull = value.length >= MAX_QUESTIONS;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Suggested */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">{t("suggested")}</h3>
        <ul className="mt-3 space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {suggestions.length === 0 && (
            <li className="text-xs text-muted-foreground italic">…</li>
          )}
          {suggestions.map((tpl) => {
            const checked = selectedSlugs.has(tpl.slug);
            return (
              <li key={tpl.slug}>
                <button
                  type="button"
                  disabled={disabled || (isFull && !checked)}
                  onClick={() => (checked ? remove(tpl.slug) : addTemplate(tpl))}
                  className={cn(
                    "w-full text-left rounded-md border px-3 py-2 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    checked
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40",
                    disabled && "opacity-60 cursor-not-allowed",
                  )}
                  aria-pressed={checked}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{renderText(tpl)}</span>
                    {tpl.is_canonical && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Lock className="h-3 w-3" /> {t("lockedHint")}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Your list */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {t("yourList", { count: value.length, max: MAX_QUESTIONS })}
          </h3>
          {isFull && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("tooManyHint")}
            </span>
          )}
        </div>

        {value.length === 0 ? (
          <p className="mt-4 text-xs text-muted-foreground italic">{t("empty")}</p>
        ) : (
          <ol className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {value
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((q, idx) => (
                <li
                  key={q.id}
                  className="flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <span className="text-xs font-semibold text-muted-foreground mt-0.5">
                    {idx + 1}.
                  </span>
                  <span className="flex-1">{renderText(q)}</span>
                  {q.locked ? (
                    <span title={t("lockedHint")} aria-label={t("lockedHint")}>
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => remove(q.id)}
                      disabled={disabled}
                      aria-label={t("remove")}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
          </ol>
        )}

        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium text-foreground">{t("addCustom")}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={t("addCustomPlaceholder")}
              maxLength={500}
              disabled={disabled || isFull}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={disabled || isFull || !customText.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("add")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
