import { apiFetch, unwrapData } from "../client";

export type ReminderType = "medicine" | "appointment" | "exercise";
export type ReminderRepeat = "once" | "daily" | "weekly" | "monthly";

/**
 * Mirrors backend `app/schemas/reminders.py:ReminderDTO`. Optional B7 schedule
 * fields (`tzid`, `weekday_mask`, `day_of_month`, `next_occurrence_at`) are
 * accepted but ignored by mobile UI today.
 */
export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  time: string; // HH:MM
  repeat: ReminderRepeat;
  done: boolean;
  note?: string | null;
  tzid?: string;
  weekday_mask?: number | null;
  day_of_month?: number | null;
  next_occurrence_at?: string | null;
}

export interface ReminderCreate {
  type: ReminderType;
  title: string;
  time: string;
  repeat: ReminderRepeat;
  note?: string;
}

/**
 * Mirrors backend `app/schemas/reminders.py:ReminderOccurrenceDTO`.
 * Each occurrence is a single fire of a reminder; backend tracks status
 * (pending / done / skipped / snoozed) per occurrence.
 */
export interface ReminderOccurrence {
  id: string;
  reminder_id: string;
  title: string;
  type: ReminderType;
  scheduled_at: string;
  status: string;
  snoozed_until?: string | null;
  done_at?: string | null;
  skipped_at?: string | null;
}

export async function fetchReminders(type?: ReminderType): Promise<Reminder[]> {
  const res = await apiFetch<{ data: Reminder[] }>("/v1/reminders", {
    query: { type },
  });
  return unwrapData(res);
}

export async function fetchUpcomingReminders(): Promise<Reminder[]> {
  const res = await apiFetch<{ data: Reminder[] }>("/v1/reminders/upcoming");
  return unwrapData(res);
}

export async function createReminder(payload: ReminderCreate): Promise<Reminder> {
  const res = await apiFetch<{ data: Reminder }>("/v1/reminders", {
    method: "POST",
    body: payload,
  });
  return unwrapData(res);
}

export async function updateReminderDone(
  id: string,
  done: boolean
): Promise<Reminder> {
  const res = await apiFetch<{ data: Reminder }>(`/v1/reminders/${id}`, {
    method: "PATCH",
    body: { done },
  });
  return unwrapData(res);
}

export async function deleteReminder(id: string): Promise<void> {
  await apiFetch<null>(`/v1/reminders/${id}`, { method: "DELETE" });
}

/**
 * GET /v1/reminders/occurrences — server-driven "today" tab. Either pass
 * an explicit ISO range via `from`/`to`, or pass `today=true` and let the
 * backend compute the day window in `tzid` (default `Asia/Ho_Chi_Minh`).
 */
export async function fetchReminderOccurrences(opts: {
  from?: string;
  to?: string;
  today?: boolean;
  tzid?: string;
  status?: string;
} = { today: true }): Promise<ReminderOccurrence[]> {
  const res = await apiFetch<{ data: ReminderOccurrence[] }>(
    "/v1/reminders/occurrences",
    { query: opts }
  );
  return unwrapData(res);
}

export async function snoozeReminder(
  reminderId: string,
  payload:
    | { minutes: number; occurrence_id?: string }
    | { until: string; occurrence_id?: string }
): Promise<ReminderOccurrence> {
  const res = await apiFetch<{ data: ReminderOccurrence }>(
    `/v1/reminders/${reminderId}/snooze`,
    { method: "POST", body: payload }
  );
  return unwrapData(res);
}

export async function skipReminder(
  reminderId: string,
  occurrenceId?: string
): Promise<ReminderOccurrence> {
  const res = await apiFetch<{ data: ReminderOccurrence }>(
    `/v1/reminders/${reminderId}/skip`,
    {
      method: "POST",
      body: occurrenceId ? { occurrence_id: occurrenceId } : {},
    }
  );
  return unwrapData(res);
}

export async function markOccurrenceDone(
  reminderId: string,
  occurrenceId?: string
): Promise<ReminderOccurrence> {
  const res = await apiFetch<{ data: ReminderOccurrence }>(
    `/v1/reminders/${reminderId}/done`,
    {
      method: "POST",
      body: occurrenceId ? { occurrence_id: occurrenceId } : {},
    }
  );
  return unwrapData(res);
}
