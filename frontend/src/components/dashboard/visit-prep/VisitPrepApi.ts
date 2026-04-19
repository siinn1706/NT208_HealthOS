/**
 * Tiny client-side fetch helpers for the Pre-Visit Brief BFF.
 *
 * Every request goes through `/api/v1/visit-briefs/**` (the BFF), which
 * proxies to Core BE. We keep this thin: the only logic here is unwrapping
 * the `{ data }` envelope and surfacing a typed error on failure.
 */
import type {
  AppointmentBriefLink,
  QuestionItem,
  QuestionTemplate,
  SymptomEntry,
  TriageOutcome,
  VisitBrief,
  VisitBriefDetail,
  VisitBriefStatus,
  VisitType,
} from "@/types/api";

export class VisitPrepApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "VisitPrepApiError";
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new VisitPrepApiError(
      res.status,
      err?.code ?? `HTTP_${res.status}`,
      err?.message ?? `Request failed (${res.status})`,
    );
  }
  return ((body as { data?: T } | null)?.data ?? (body as T)) as T;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

// ─── Briefs ─────────────────────────────────────────────────────────────────

export async function listBriefs(opts: {
  status?: VisitBriefStatus | null;
  page?: number;
  perPage?: number;
} = {}): Promise<{ data: VisitBrief[]; meta: { page: number; per_page: number; total: number } }> {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  params.set("page", String(opts.page ?? 1));
  params.set("per_page", String(opts.perPage ?? 50));
  const res = await fetch(`/api/v1/visit-briefs?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  const text = await res.text();
  let body: { data?: VisitBrief[]; meta?: { page: number; per_page: number; total: number }; error?: { code?: string; message?: string } } = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = {};
    }
  }
  if (!res.ok) {
    throw new VisitPrepApiError(
      res.status,
      body.error?.code ?? `HTTP_${res.status}`,
      body.error?.message ?? `Request failed (${res.status})`,
    );
  }
  return {
    data: body.data ?? [],
    meta: body.meta ?? { page: 1, per_page: 50, total: body.data?.length ?? 0 },
  };
}

export async function createBrief(payload: {
  visit_type: VisitType;
  title?: string | null;
  attach_to_appointment_id?: string | null;
  /** When set, BE clones symptoms + question_set from the source brief
   *  and bumps `revision`. See review fix T1. */
  clone_from_brief_id?: string | null;
}): Promise<VisitBriefDetail> {
  const res = await fetch("/api/v1/visit-briefs", {
    method: "POST",
    credentials: "include",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
  return unwrap<VisitBriefDetail>(res);
}

export async function getBrief(id: string): Promise<VisitBriefDetail> {
  const res = await fetch(`/api/v1/visit-briefs/${encodeURIComponent(id)}`, {
    credentials: "include",
    cache: "no-store",
  });
  return unwrap<VisitBriefDetail>(res);
}

export async function patchBrief(
  id: string,
  payload: { visit_type?: VisitType; title?: string | null },
): Promise<VisitBriefDetail> {
  const res = await fetch(`/api/v1/visit-briefs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
  return unwrap<VisitBriefDetail>(res);
}

export async function archiveBrief(id: string): Promise<VisitBriefDetail> {
  const res = await fetch(`/api/v1/visit-briefs/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  return unwrap<VisitBriefDetail>(res);
}

export async function finalizeBrief(id: string): Promise<VisitBriefDetail> {
  const res = await fetch(`/api/v1/visit-briefs/${encodeURIComponent(id)}/finalize`, {
    method: "POST",
    credentials: "include",
    headers: JSON_HEADERS,
    body: "{}",
  });
  return unwrap<VisitBriefDetail>(res);
}

// ─── Symptoms ───────────────────────────────────────────────────────────────

export async function addSymptom(
  briefId: string,
  payload: Partial<Omit<SymptomEntry, "id" | "visit_brief_id" | "order_index">> &
    Pick<SymptomEntry, "concern_text" | "concern_category">,
): Promise<SymptomEntry> {
  const res = await fetch(
    `/api/v1/visit-briefs/${encodeURIComponent(briefId)}/symptoms`,
    {
      method: "POST",
      credentials: "include",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
  );
  return unwrap<SymptomEntry>(res);
}

export async function updateSymptom(
  briefId: string,
  symptomId: string,
  payload: Partial<Omit<SymptomEntry, "id" | "visit_brief_id">>,
): Promise<SymptomEntry> {
  const res = await fetch(
    `/api/v1/visit-briefs/${encodeURIComponent(briefId)}/symptoms/${encodeURIComponent(symptomId)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
  );
  return unwrap<SymptomEntry>(res);
}

export async function deleteSymptom(briefId: string, symptomId: string): Promise<void> {
  const res = await fetch(
    `/api/v1/visit-briefs/${encodeURIComponent(briefId)}/symptoms/${encodeURIComponent(symptomId)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok && res.status !== 204) {
    throw new VisitPrepApiError(res.status, `HTTP_${res.status}`, "Failed to delete symptom.");
  }
}

// ─── Triage ─────────────────────────────────────────────────────────────────

export async function recomputeTriage(briefId: string): Promise<TriageOutcome> {
  const res = await fetch(
    `/api/v1/visit-briefs/${encodeURIComponent(briefId)}/route-now`,
    {
      method: "POST",
      credentials: "include",
      headers: JSON_HEADERS,
      body: "{}",
    },
  );
  return unwrap<TriageOutcome>(res);
}

// ─── Questions ──────────────────────────────────────────────────────────────

export async function getSuggestedQuestions(
  briefId: string,
  opts: { visitType?: string; concernCategory?: string } = {},
): Promise<QuestionTemplate[]> {
  const params = new URLSearchParams();
  if (opts.visitType) params.set("visit_type", opts.visitType);
  if (opts.concernCategory) params.set("concern_category", opts.concernCategory);
  const qs = params.toString();
  const res = await fetch(
    `/api/v1/visit-briefs/${encodeURIComponent(briefId)}/questions/suggested${qs ? `?${qs}` : ""}`,
    { credentials: "include", cache: "no-store" },
  );
  return unwrap<QuestionTemplate[]>(res);
}

export async function replaceQuestions(
  briefId: string,
  questions: QuestionItem[],
): Promise<{ id: string; visit_brief_id: string; questions: QuestionItem[] }> {
  const res = await fetch(
    `/api/v1/visit-briefs/${encodeURIComponent(briefId)}/questions`,
    {
      method: "PATCH",
      credentials: "include",
      headers: JSON_HEADERS,
      body: JSON.stringify({ questions }),
    },
  );
  return unwrap(res);
}

// ─── Appointment links ─────────────────────────────────────────────────────

export async function attachToAppointment(
  briefId: string,
  appointmentId: string,
): Promise<AppointmentBriefLink> {
  const res = await fetch(
    `/api/v1/visit-briefs/${encodeURIComponent(briefId)}/attach`,
    {
      method: "POST",
      credentials: "include",
      headers: JSON_HEADERS,
      body: JSON.stringify({ appointment_id: appointmentId }),
    },
  );
  return unwrap<AppointmentBriefLink>(res);
}

export async function detachFromAppointment(
  briefId: string,
  linkId: string,
): Promise<AppointmentBriefLink> {
  const res = await fetch(
    `/api/v1/visit-briefs/${encodeURIComponent(briefId)}/attach/${encodeURIComponent(linkId)}`,
    { method: "DELETE", credentials: "include" },
  );
  return unwrap<AppointmentBriefLink>(res);
}
