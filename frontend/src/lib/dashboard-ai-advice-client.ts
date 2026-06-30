import type { DataResponse } from "@/types/api";

export type DashboardAiAdviceSource = "ai" | "rule" | "cache";
export type DashboardAiAdviceStatus = "ready" | "fallback";
export type DashboardAiAdviceActionType =
  | "log_meal"
  | "walk"
  | "sleep_hygiene"
  | "view_trends"
  | "open_chat"
  | "track_vitals";

export interface DashboardAiAdviceAction {
  id: string;
  label: string;
  route?: string | null;
  type: DashboardAiAdviceActionType;
}

export interface DashboardAiAdviceEvidence {
  metric: string;
  value: number | string | null;
  unit?: string | null;
  comparison?: string | null;
}

export interface DashboardAiAdvice {
  id: string;
  status: DashboardAiAdviceStatus;
  category: "nutrition" | "activity" | "sleep" | "vitals" | "medication" | "general";
  priority: "low" | "medium" | "high";
  title: string;
  body: string;
  actions: DashboardAiAdviceAction[];
  evidence: DashboardAiAdviceEvidence[];
  source: DashboardAiAdviceSource;
  rag_sources?: Array<{ title: string; organization: string; url: string }>;
  generated_at: string;
  expires_at: string;
  disclaimer: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAdviceAction(value: unknown): value is DashboardAiAdviceAction {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.label === "string" && typeof value.type === "string";
}

function isAdviceEvidence(value: unknown): value is DashboardAiAdviceEvidence {
  if (!isRecord(value)) return false;
  return typeof value.metric === "string" && (
    value.value === null ||
    typeof value.value === "string" ||
    typeof value.value === "number"
  );
}

function isDashboardAiAdvice(value: unknown): value is DashboardAiAdvice {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.status === "ready" || value.status === "fallback") &&
    typeof value.category === "string" &&
    typeof value.priority === "string" &&
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    Array.isArray(value.actions) &&
    value.actions.every(isAdviceAction) &&
    Array.isArray(value.evidence) &&
    value.evidence.every(isAdviceEvidence) &&
    (value.source === "ai" || value.source === "rule" || value.source === "cache") &&
    typeof value.generated_at === "string" &&
    typeof value.expires_at === "string" &&
    typeof value.disclaimer === "string"
  );
}

export async function fetchDashboardAiAdvice({
  locale,
  surface,
  signal,
}: {
  locale: string;
  surface: "web" | "mobile";
  signal?: AbortSignal;
}): Promise<DashboardAiAdvice> {
  const params = new URLSearchParams({ locale, surface });
  const response = await fetch(`/api/v1/dashboard/ai-advice?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });
  const json = await response.json().catch(() => null) as DataResponse<unknown> | null;
  if (!response.ok) {
    throw new Error(`AI advice request failed with status ${response.status}.`);
  }
  if (!isDashboardAiAdvice(json?.data)) {
    throw new Error("AI advice response was invalid.");
  }
  return json.data;
}
