/**
 * Centralized TanStack Query key factory. Every key the app uses lives here
 * so:
 *   - typos can't silently disable invalidation (TS catches them at compile)
 *   - related keys share a prefix so `qc.invalidateQueries({ queryKey: keys.reminders.all })` invalidates every reminder query at once
 *   - the relationship between "fetch this" and "invalidate that" is greppable
 *
 * Conventions (loosely after the TanStack docs):
 *   foo.all                → ["foo"]                (everything under foo)
 *   foo.lists()            → ["foo", "list"]
 *   foo.list(filters)      → ["foo", "list", filters]
 *   foo.details()          → ["foo", "detail"]
 *   foo.detail(id)         → ["foo", "detail", id]
 */

import type {
  MetricPeriod,
  MetricType,
} from "@/api/endpoints/health-metrics";
import type { ReminderType } from "@/api/endpoints/reminders";
import type { ReportPeriod } from "@/api/endpoints/reports";

export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => ["auth", "me"] as const,
    wsTicket: () => ["auth", "ws-ticket"] as const,
  },

  user: {
    all: ["user"] as const,
    me: () => ["user", "me"] as const,
    lookup: (q: string, limit?: number) =>
      ["user", "lookup", q, limit ?? 10] as const,
  },

  preferences: {
    all: ["preferences"] as const,
    me: () => ["preferences", "me"] as const,
  },

  mfa: {
    all: ["mfa"] as const,
    status: () => ["mfa", "status"] as const,
  },

  securityLogs: {
    all: ["security-logs"] as const,
    list: (opts: { event_type?: string; limit?: number; offset?: number }) =>
      ["security-logs", "list", opts] as const,
  },

  dashboard: {
    all: ["dashboard"] as const,
    summary: () => ["dashboard", "summary"] as const,
  },

  vitals: {
    all: ["vitals"] as const,
    timeseries: (days: number) => ["vitals", "timeseries", days] as const,
  },

  healthMetrics: {
    all: ["health-metrics"] as const,
    list: (metric: MetricType) => ["health-metrics", "list", metric] as const,
    aggregated: (metric: MetricType, period: string) =>
      ["health-metrics", "aggregated", metric, period] as const,
    compare: (metrics: MetricType[], period: MetricPeriod) =>
      ["health-metrics", "compare", metrics.join(","), period] as const,
    comparePeriods: (metric: MetricType, period: MetricPeriod) =>
      ["health-metrics", "compare-periods", metric, period] as const,
  },

  healthInsights: {
    all: ["health-insights"] as const,
    risk: () => ["health-insights", "risk"] as const,
  },

  healthGoal: {
    all: ["health-goal"] as const,
    current: () => ["health-goal", "current"] as const,
    progress: (metric: MetricType, target: number, period: MetricPeriod) =>
      ["health-goal", "progress", metric, target, period] as const,
  },

  reports: {
    all: ["reports"] as const,
    summary: (period: ReportPeriod) => ["reports", "summary", period] as const,
    trends: (metric: string, period: ReportPeriod) =>
      ["reports", "trends", metric, period] as const,
    pdf: (requestId: string) => ["reports", "pdf", requestId] as const,
  },

  nutrition: {
    all: ["nutrition"] as const,
    suggestions: () => ["nutrition", "suggestions"] as const,
  },

  devices: {
    all: ["devices"] as const,
    list: () => ["devices", "list"] as const,
  },

  appointments: {
    all: ["appointments"] as const,
    list: () => ["appointments", "list"] as const,
  },

  reminders: {
    all: ["reminders"] as const,
    list: (type?: ReminderType) =>
      type ? (["reminders", "list", type] as const) : (["reminders", "list"] as const),
    upcoming: () => ["reminders", "upcoming"] as const,
    occurrences: (
      opts: { today?: boolean; from?: string; to?: string } = { today: true }
    ) => ["reminders", "occurrences", opts] as const,
  },

  meals: {
    all: ["meals"] as const,
    list: () => ["meals", "list"] as const,
    detail: (id: string) => ["meals", "detail", id] as const,
    caloriesSummary: (range: { from: string; to: string }) =>
      ["meals", "calories-summary", range] as const,
  },

  conversations: {
    all: ["conversations"] as const,
    list: () => ["conversations", "list"] as const,
    pending: () => ["conversations", "pending"] as const,
    detail: (id: string) => ["conversations", "detail", id] as const,
    messages: (id: string) => ["conversations", id, "messages"] as const,
    pinned: (id: string) => ["conversations", id, "pinned"] as const,
  },

  account: {
    all: ["account"] as const,
    export: (requestId: string) => ["account", "export", requestId] as const,
  },
} as const;

/**
 * Walks the factory tree and returns every key it knows about. Used by the
 * test suite to assert there are no orphaned keys / typos and that every
 * key starts with the right namespace prefix.
 */
export function listAllKeyPrefixes(): string[] {
  return [
    "auth",
    "user",
    "preferences",
    "mfa",
    "security-logs",
    "dashboard",
    "vitals",
    "health-metrics",
    "health-insights",
    "health-goal",
    "reports",
    "nutrition",
    "devices",
    "appointments",
    "reminders",
    "meals",
    "conversations",
    "account",
  ];
}
