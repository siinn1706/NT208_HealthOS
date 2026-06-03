"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Loader2,
  Lock,
  Paperclip,
  Plus,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  AppointmentBriefLink,
  ConcernCategory,
  QuestionItem,
  SymptomEntry,
  TriageOutcome,
  VisitBriefDetail,
  VisitType,
} from "@/types/api";
import { BriefStatusBadge } from "./BriefStatusBadge";
import { VisitPrepDisclaimer } from "./Disclaimer";
import { VisitTypePicker } from "./VisitTypePicker";
import { ConcernEntryForm, type ConcernDraft } from "./ConcernEntryForm";
import { RoutingOutcomeCard } from "./RoutingOutcomeCard";
import { QuestionBuilder } from "./QuestionBuilder";
import { VisitBriefAttachDialog } from "./VisitBriefAttachDialog";
import {
  addSymptom,
  archiveBrief,
  createBrief,
  deleteSymptom,
  finalizeBrief,
  patchBrief,
  recomputeTriage,
  replaceQuestions,
  updateSymptom,
} from "./VisitPrepApi";

const STEPS = ["visitType", "concerns", "questions", "routing", "review"] as const;
type StepKey = (typeof STEPS)[number];

const MAX_CONCERNS = 5;

function getQuestionText(item: QuestionItem, locale: string) {
  return locale === "vi" ? item.text_vi : item.text_en;
}

function emptyConcern(): ConcernDraft {
  return {
    concern_text: "",
    concern_category: "other",
    onset_date: null,
    duration_value: null,
    duration_unit: null,
    // Review fix T3: severity stays null until the user explicitly drags
    // the slider — auto-defaulting to 5 silently biased the engine toward
    // "moderate persistent" classifications.
    severity_0_10: null,
    triggers: null,
    better_with: null,
    worse_with: null,
    meds_taken: null,
    prior_care: null,
  };
}

function symptomToDraft(sym: SymptomEntry): ConcernDraft {
  return {
    id: sym.id,
    concern_text: sym.concern_text,
    concern_category: sym.concern_category,
    onset_date: sym.onset_date,
    duration_value: sym.duration_value,
    duration_unit: sym.duration_unit,
    severity_0_10: sym.severity_0_10,
    triggers: sym.triggers,
    better_with: sym.better_with,
    worse_with: sym.worse_with,
    meds_taken: sym.meds_taken,
    prior_care: sym.prior_care,
  };
}

interface Props {
  initial: VisitBriefDetail;
  /** Optional appointment id from `?attach=` — auto-attach after finalize. */
  attachToAppointmentId?: string | null;
}

export function VisitPrepWizardClient({ initial, attachToAppointmentId }: Props) {
  const t = useTranslations("dashboard.visitPrep");
  const tWiz = useTranslations("dashboard.visitPrep.wizard");
  const tStatus = useTranslations("dashboard.visitPrep.status");
  const locale = useLocale();
  const router = useRouter();

  const [brief, setBrief] = useState<VisitBriefDetail>(initial);
  const [step, setStep] = useState<StepKey>("visitType");
  const [concerns, setConcerns] = useState<ConcernDraft[]>(() =>
    initial.symptoms.length > 0 ? initial.symptoms.map(symptomToDraft) : [emptyConcern()],
  );
  const [questions, setQuestions] = useState<QuestionItem[]>(
    initial.question_set?.questions ?? [],
  );
  const [latestTriage, setLatestTriage] = useState<TriageOutcome | null>(
    initial.latest_triage ?? null,
  );
  const [pending, setPending] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  const isReadOnly = brief.status !== "draft";
  const stepIndex = STEPS.indexOf(step);

  // Sync questions back to BE on change (debounced).
  useEffect(() => {
    if (isReadOnly) return;
    const timer = setTimeout(() => {
      void replaceQuestions(brief.id, questions).catch(() => {
        toast.error(t("errors.saveFailed"));
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [brief.id, isReadOnly, questions, t]);

  const concernCategories = useMemo<ConcernCategory[]>(
    () => concerns.map((c) => c.concern_category),
    [concerns],
  );

  // ─── Actions ──────────────────────────────────────────────────────────

  const persistVisitType = useCallback(
    async (next: VisitType) => {
      if (next === brief.visit_type || isReadOnly) return;
      try {
        const updated = await patchBrief(brief.id, { visit_type: next });
        setBrief(updated);
      } catch {
        toast.error(t("errors.saveFailed"));
      }
    },
    [brief.id, brief.visit_type, isReadOnly, t],
  );

  const persistConcernAt = useCallback(
    async (idx: number): Promise<SymptomEntry | undefined> => {
      if (isReadOnly) return undefined;
      const draft = concerns[idx];
      if (!draft) return undefined;
      const trimmed = draft.concern_text.trim();
      if (!trimmed) return undefined;
      setPending(true);
      try {
        const payload = {
          ...draft,
          concern_text: trimmed,
        };
        let saved: SymptomEntry;
        if (draft.id) {
          saved = await updateSymptom(brief.id, draft.id, payload);
        } else {
          saved = await addSymptom(brief.id, {
            concern_text: payload.concern_text,
            concern_category: payload.concern_category,
            onset_date: payload.onset_date,
            duration_value: payload.duration_value,
            duration_unit: payload.duration_unit,
            severity_0_10: payload.severity_0_10,
            triggers: payload.triggers,
            better_with: payload.better_with,
            worse_with: payload.worse_with,
            meds_taken: payload.meds_taken,
            prior_care: payload.prior_care,
          });
        }
        setConcerns((prev) => {
          const next = prev.slice();
          next[idx] = symptomToDraft(saved);
          return next;
        });
        // Trigger an explicit recompute so the routing card reflects the
        // change immediately — the BE also recomputes server-side, but
        // pulling the result with one round-trip keeps the UI honest.
        const t2 = await recomputeTriage(brief.id);
        setLatestTriage(t2);
        return saved;
      } catch {
        toast.error(t("errors.saveFailed"));
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [brief.id, concerns, isReadOnly, t],
  );

  const removeConcernAt = useCallback(
    async (idx: number) => {
      if (isReadOnly) return;
      const draft = concerns[idx];
      if (!draft) return;
      try {
        if (draft.id) {
          await deleteSymptom(brief.id, draft.id);
          const t2 = await recomputeTriage(brief.id);
          setLatestTriage(t2);
        }
        setConcerns((prev) => prev.filter((_, i) => i !== idx));
      } catch {
        toast.error(t("errors.saveFailed"));
      }
    },
    [brief.id, concerns, isReadOnly, t],
  );

  const handleRecompute = useCallback(async () => {
    setRecomputing(true);
    try {
      const fresh = await recomputeTriage(brief.id);
      setLatestTriage(fresh);
    } catch {
      toast.error(t("errors.saveFailed"));
    } finally {
      setRecomputing(false);
    }
  }, [brief.id, t]);

  // Review fix T4: flush any concern that has typed text but hasn't yet been
  // saved to the BE. Returns the up-to-date concern list when successful, or
  // null if at least one save failed (so callers don't validate stale state).
  const flushUnsavedConcerns = useCallback(async (): Promise<ConcernDraft[] | null> => {
    if (isReadOnly) return concerns;
    let allOk = true;
    const nextConcerns = concerns.slice();
    for (let idx = 0; idx < concerns.length; idx++) {
      const c = concerns[idx];
      if (!c.concern_text.trim() || c.id) continue;
      try {
        // oxlint-disable-next-line react-doctor/async-await-in-loop -- Draft saves update indexed state and triage in stable order.
        const saved = await persistConcernAt(idx);
        if (saved) {
          nextConcerns[idx] = symptomToDraft(saved);
        } else {
          allOk = false;
        }
      } catch {
        allOk = false;
      }
    }
    if (!allOk) return null;
    setConcerns(nextConcerns);
    return nextConcerns;
  }, [concerns, isReadOnly, persistConcernAt]);

  // Wraps any "go to step X" transition with an auto-save pass so users can
  // type a concern and click Next/click a step chip without losing data.
  const goToStep = useCallback(
    async (target: StepKey) => {
      if (target === step) return;
      if (!isReadOnly && step === "concerns") {
        const flushed = await flushUnsavedConcerns();
        if (!flushed) {
          toast.error(t("errors.saveFailed"));
          return;
        }
      }
      setStep(target);
    },
    [flushUnsavedConcerns, isReadOnly, step, t],
  );

  const handleFinalize = useCallback(async () => {
    if (isReadOnly) return;
    setPending(true);
    try {
      // Auto-save any unsaved typed concerns before validating, so users
      // who skipped the per-concern "Save concern" button don't see a
      // confusing "Add at least one concern" error when text is on screen.
      const flushedConcerns = await flushUnsavedConcerns();
      if (!flushedConcerns) {
        toast.error(t("errors.saveFailed"));
        return;
      }
      const persistedCount = flushedConcerns.filter(
        (c) => c.concern_text.trim() && c.id,
      ).length;
      if (persistedCount === 0 || questions.length === 0) {
        toast.error(t("errors.finalizeRequirements"));
        return;
      }
      const updated = await finalizeBrief(brief.id);
      setBrief(updated);
      setLatestTriage(updated.latest_triage ?? null);
      toast.success(t("finalized.title"));
      if (attachToAppointmentId) {
        setAttachOpen(true);
      }
    } catch (err) {
      toast.error((err as Error).message || t("errors.saveFailed"));
    } finally {
      setPending(false);
    }
  }, [
    attachToAppointmentId,
    brief.id,
    flushUnsavedConcerns,
    isReadOnly,
    questions.length,
    t,
  ]);

  const handleAttached = useCallback((link: AppointmentBriefLink) => {
    setBrief((prev) => ({
      ...prev,
      appointment_links: [
        ...prev.appointment_links.filter((l) => l.id !== link.id),
        link,
      ],
    }));
    toast.success(t("attach.attached", { label: "" }).trim());
  }, [t]);

  const handleArchive = useCallback(async () => {
    try {
      await archiveBrief(brief.id);
      router.push("/dashboard/visit-prep");
    } catch {
      toast.error(t("errors.saveFailed"));
    }
  }, [brief.id, router, t]);

  const handleNewRevision = useCallback(async () => {
    // Review fix T1: clone the source brief on the BE rather than building
    // an empty draft and forcing the user to retype everything.
    try {
      const fresh = await createBrief({
        visit_type: brief.visit_type,
        title: brief.title,
        clone_from_brief_id: brief.id,
      });
      router.push(`/dashboard/visit-prep/${fresh.id}`);
    } catch {
      toast.error(t("errors.saveFailed"));
    }
  }, [brief.id, brief.title, brief.visit_type, router, t]);

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-5 sm:px-6 lg:px-8 space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{t("pageTitle")}</h1>
            <BriefStatusBadge status={brief.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {tWiz("savedAt", { when: new Date(brief.updated_at).toLocaleString(locale) })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isReadOnly && (
            <button
              type="button"
              onClick={handleNewRevision}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              {tWiz("newRevision")}
            </button>
          )}
          <Link
            href={`/dashboard/visit-prep/${brief.id}/print`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            <Printer className="size-3.5" />
            {t("review.print")}
          </Link>
          <a
            href={`/api/v1/visit-briefs/${encodeURIComponent(brief.id)}/pdf?locale=${locale}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            <Download className="size-3.5" />
            PDF
          </a>
          {brief.status !== "archived" && (
            <button
              type="button"
              onClick={() => setAttachOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Paperclip className="size-3.5" />
              {t("attach.attachAction")}
            </button>
          )}
        </div>
      </header>

      <VisitPrepDisclaimer />

      {isReadOnly && (
        <output
          className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2"
        >
          <Lock className="size-3.5" /> {tWiz("cannotEdit")}
        </output>
      )}

      <ol className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/20 p-2">
        {STEPS.map((s, idx) => (
          <li key={s} className="flex-1 min-w-[110px]">
            <button
              type="button"
              onClick={() => void goToStep(s)}
              className={cn(
                "w-full text-[11px] font-medium uppercase tracking-wide text-center px-2 py-1.5 rounded-md border transition-colors",
                idx === stepIndex
                  ? "bg-primary text-primary-foreground border-primary"
                  : idx < stepIndex
                    ? "border-primary/40 text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {tWiz(`steps.${s === "visitType" ? "visitType" : s === "concerns" ? "concern" : s === "questions" ? "questions" : s === "routing" ? "routing" : "review"}` as Parameters<typeof tWiz>[0])}
            </button>
          </li>
        ))}
      </ol>

      {/* ── Step content ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        {step === "visitType" && (
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              {tWiz("steps.visitType")}
            </h2>
            <VisitTypePicker
              value={brief.visit_type}
              onChange={persistVisitType}
              disabled={isReadOnly}
            />
          </section>
        )}

        {step === "concerns" && (
          <section className="space-y-4">
            <header className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                {tWiz("steps.concern")}
              </h2>
              <span className="text-xs text-muted-foreground">
                {tWiz("maxConcernsHelp", { max: MAX_CONCERNS })}
              </span>
            </header>
            <div className="space-y-4">
              {concerns.map((c, idx) => (
                <div key={c.id ?? `new-${idx}`} className="space-y-2">
                  <ConcernEntryForm
                    index={idx}
                    value={c}
                    disabled={isReadOnly}
                    onChange={(next) =>
                      setConcerns((prev) =>
                        prev.map((item, i) => (i === idx ? next : item)),
                      )
                    }
                    onRemove={() => void removeConcernAt(idx)}
                    removable={!isReadOnly && (concerns.length > 1 || !!c.id)}
                  />
                  {!isReadOnly && (
                    <div className="flex items-center justify-end gap-2">
                      {c.concern_text.trim() && !c.id && (
                        // Review fix T4: surface "unsaved" state so users
                        // can see the per-concern Save button even when it
                        // sits below the fold. Auto-save also triggers on
                        // step navigation as a safety net.
                        <output
                          className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warning"
                        >
                          {tWiz("unsavedBadge")}
                        </output>
                      )}
                      <button
                        type="button"
                        onClick={() => void persistConcernAt(idx)}
                        disabled={!c.concern_text.trim() || pending}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {pending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3.5" />
                        )}
                        {c.id ? tWiz("savedAt", { when: "" }).trim() || "Save" : "Save concern"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {!isReadOnly && concerns.length < MAX_CONCERNS && (
                <button
                  type="button"
                  onClick={() => setConcerns((prev) => [...prev, emptyConcern()])}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <Plus className="size-4" />
                  {tWiz("addAnother")}
                </button>
              )}
            </div>
          </section>
        )}

        {step === "questions" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-base font-semibold text-foreground">
                {t("questions.title")}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {t("questions.subtitle", { max: 10 })}
              </p>
            </header>
            <QuestionBuilder
              briefId={brief.id}
              visitType={brief.visit_type}
              concernCategories={concernCategories}
              value={questions}
              onChange={setQuestions}
              disabled={isReadOnly}
            />
          </section>
        )}

        {step === "routing" && (
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              {tWiz("steps.routing")}
            </h2>
            <RoutingOutcomeCard
              outcome={latestTriage}
              onRecompute={handleRecompute}
              isRecomputing={recomputing}
              onBookAppointment={() =>
                router.push("/dashboard/appointments?create=1" as never)
              }
            />
          </section>
        )}

        {step === "review" && (
          <section className="space-y-4">
            <header className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                {t("review.title")}
              </h2>
            </header>
            <ReviewSummary
              brief={brief}
              concerns={concerns}
              questions={questions}
              latestTriage={latestTriage}
            />
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => void handleFinalize()}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                {pending ? tWiz("finalizing") : tWiz("finalize")}
              </button>
            )}
            {brief.status === "draft" && (
              <button
                type="button"
                onClick={() => void handleArchive()}
                className="ml-3 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                {tStatus("archived")}
              </button>
            )}
          </section>
        )}
      </div>

      {/* ── Step nav ──────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={() => void goToStep(STEPS[Math.max(0, stepIndex - 1)])}
          disabled={stepIndex === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          <ArrowLeft className="size-3.5" />
          {tWiz("back")}
        </button>
        <button
          type="button"
          onClick={() => void goToStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)])}
          disabled={stepIndex === STEPS.length - 1}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {tWiz("next")}
          <ArrowRight className="size-3.5" />
        </button>
      </nav>

      <VisitBriefAttachDialog
        key={`${brief.id}:${attachOpen ? "open" : "closed"}:${attachToAppointmentId ?? "none"}`}
        open={attachOpen}
        onOpenChange={setAttachOpen}
        briefId={brief.id}
        preselectAppointmentId={attachToAppointmentId}
        onAttached={handleAttached}
      />
    </div>
  );
}

function ReviewSummary({
  brief,
  concerns,
  questions,
  latestTriage,
}: {
  brief: VisitBriefDetail;
  concerns: ConcernDraft[];
  questions: QuestionItem[];
  latestTriage: TriageOutcome | null;
}) {
  const t = useTranslations("dashboard.visitPrep");
  const tCat = useTranslations("dashboard.visitPrep.concernCategories");
  const tType = useTranslations("dashboard.visitPrep.visitTypes");
  const locale = useLocale();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">{tType(brief.visit_type)}</h3>
        <h4 className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
          {t("review.concernsHeader")}
        </h4>
        <ul className="mt-2 space-y-2 text-sm">
          {concerns.reduce<ReactNode[]>((items, c) => {
            if (!c.concern_text.trim()) return items;
            const idx = items.length;
            items.push(
              <li key={c.id ?? idx} className="text-foreground">
                <span className="font-medium">{c.concern_text}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  · {tCat(c.concern_category)}
                  {c.severity_0_10 != null && ` · ${c.severity_0_10}/10`}
                </span>
              </li>
            );
            return items;
          }, [])}
        </ul>
      </section>
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("review.questionsHeader")}
        </h3>
        <ol className="mt-3 space-y-2 text-sm">
          {questions
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((q, idx) => (
              <li key={q.id} className="text-foreground">
                <span className="text-xs font-semibold text-muted-foreground mr-1">
                  {idx + 1}.
                </span>
                {getQuestionText(q, locale)}
              </li>
            ))}
        </ol>
      </section>
      <section className="md:col-span-2">
        <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          {t("review.routingHeader")}
        </h3>
        <RoutingOutcomeCard outcome={latestTriage} />
      </section>
    </div>
  );
}
