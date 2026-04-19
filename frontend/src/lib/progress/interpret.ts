/**
 * interpretBmiSeries — pure function that turns a BMI time series + a goal
 * into one calm, unambiguous insight to surface in TodayInsightCard.
 *
 * Design intent:
 *   - Always returns exactly one outcome (the most informative).
 *   - Deterministic given (series, goal, profile) — no Date.now() inside.
 *   - Never alarmist. Severity is `info | success | caution`, never `danger`.
 *   - Translation strings live in the consumer (i18n keys are just identifiers
 *     here so the UI can render in any locale).
 *
 * The five outcomes plus the new-user path mirror §3.6 of the master plan.
 */

export type InsightKind =
  | "new_user"
  | "no_readings"
  | "stale"
  | "stable"
  | "trending_to_target"
  | "trending_away";

export type InsightSeverity = "info" | "success" | "caution";

export interface InsightSeriesPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** BMI for this point (already computed from weight + height upstream). */
  bmi: number;
}

export interface InsightGoal {
  /** Target BMI; null if the user hasn't set a weight goal yet. */
  targetBmi: number | null;
}

export interface InsightProfile {
  /** ISO date the account was created — used to detect first-week users. */
  createdAt?: string | null;
}

export interface InsightResult {
  kind: InsightKind;
  severity: InsightSeverity;
  /** i18n message key under `progress.insight.<kind>`. */
  messageKey: string;
  /** Numeric values the message template can interpolate. */
  values: Record<string, number | string | null>;
  /** ISO timestamp of the most recent reading, if any (used by FreshnessTag). */
  lastReadingAt: string | null;
}

/** Considered stale once no reading exists in the last `STALE_DAYS` days. */
const STALE_DAYS = 3;
/** A "stable" trend means absolute change over the window is below this BMI delta. */
const STABLE_BMI_EPSILON = 0.3;
/** New users get the welcoming insight for their first `NEW_USER_DAYS` days. */
const NEW_USER_DAYS = 7;

function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.floor((b - a) / 86_400_000);
}

/**
 * Decide which insight to render. Pass `now` explicitly so the function is
 * fully deterministic and trivial to unit-test; defaults to `Date.now()`.
 */
export function interpretBmiSeries(
  series: InsightSeriesPoint[],
  goal: InsightGoal,
  profile: InsightProfile = {},
  now: number = Date.now()
): InsightResult {
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1] ?? null;
  const lastReadingAt = last?.date ?? null;
  const nowIso = new Date(now).toISOString().slice(0, 10);

  // First-week welcome — beats the "stale" path because new accounts haven't
  // had a chance to log anything yet.
  if (profile.createdAt) {
    const accountAgeDays = daysBetween(profile.createdAt.slice(0, 10), nowIso);
    if (accountAgeDays <= NEW_USER_DAYS) {
      return {
        kind: "new_user",
        severity: "info",
        messageKey: "progress.insight.newUser",
        values: { days: accountAgeDays },
        lastReadingAt,
      };
    }
  }

  if (!last) {
    // Distinct from "stale": there is literally no reading yet, so we must
    // not render a "It's been -- days…" message. The card uses this to show
    // a first-log CTA without lying about a stale timeline (plan §B2).
    return {
      kind: "no_readings",
      severity: "info",
      messageKey: "progress.insight.noReadings",
      values: {},
      lastReadingAt: null,
    };
  }

  const daysSinceLast = daysBetween(last.date, nowIso);
  if (daysSinceLast > STALE_DAYS) {
    return {
      kind: "stale",
      severity: "caution",
      messageKey: "progress.insight.stale",
      values: { daysSince: daysSinceLast },
      lastReadingAt,
    };
  }

  // Trend math — compare last reading to the oldest reading inside the window.
  const first = sorted[0];
  const delta = last.bmi - first.bmi;
  const absDelta = Math.abs(delta);

  if (goal.targetBmi == null) {
    // No goal: report stability or absolute change neutrally.
    if (absDelta < STABLE_BMI_EPSILON) {
      return {
        kind: "stable",
        severity: "info",
        messageKey: "progress.insight.stable",
        values: { bmi: round(last.bmi, 1), windowDays: daysBetween(first.date, last.date) },
        lastReadingAt,
      };
    }
    // Without a goal, "trending" is just movement — surface it as info, not success.
    return {
      kind: delta > 0 ? "trending_away" : "trending_to_target",
      severity: "info",
      messageKey:
        delta > 0
          ? "progress.insight.trendingAwayNoGoal"
          : "progress.insight.trendingTowardNoGoal",
      values: {
        bmi: round(last.bmi, 1),
        delta: round(absDelta, 1),
        windowDays: daysBetween(first.date, last.date),
      },
      lastReadingAt,
    };
  }

  // With a goal, "toward" means reducing the gap to the target.
  const distanceFirst = Math.abs(first.bmi - goal.targetBmi);
  const distanceLast = Math.abs(last.bmi - goal.targetBmi);
  const gapClosing = distanceLast < distanceFirst - STABLE_BMI_EPSILON;
  const gapWidening = distanceLast > distanceFirst + STABLE_BMI_EPSILON;

  if (!gapClosing && !gapWidening) {
    return {
      kind: "stable",
      severity: "info",
      messageKey: "progress.insight.stable",
      values: {
        bmi: round(last.bmi, 1),
        windowDays: daysBetween(first.date, last.date),
        targetBmi: round(goal.targetBmi, 1),
      },
      lastReadingAt,
    };
  }

  if (gapClosing) {
    return {
      kind: "trending_to_target",
      severity: "success",
      messageKey: "progress.insight.trendingToTarget",
      values: {
        bmi: round(last.bmi, 1),
        targetBmi: round(goal.targetBmi, 1),
        gapClosed: round(distanceFirst - distanceLast, 1),
        windowDays: daysBetween(first.date, last.date),
      },
      lastReadingAt,
    };
  }

  return {
    kind: "trending_away",
    severity: "caution",
    messageKey: "progress.insight.trendingAway",
    values: {
      bmi: round(last.bmi, 1),
      targetBmi: round(goal.targetBmi, 1),
      gapWidened: round(distanceLast - distanceFirst, 1),
      windowDays: daysBetween(first.date, last.date),
    },
    lastReadingAt,
  };
}

function round(n: number, places: number): number {
  const m = 10 ** places;
  return Math.round(n * m) / m;
}

/**
 * Helpers exposed for tests / other call sites that want the same constants.
 */
export const INSIGHT_CONSTANTS = {
  STALE_DAYS,
  STABLE_BMI_EPSILON,
  NEW_USER_DAYS,
};
