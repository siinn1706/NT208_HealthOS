import type { MedicationPauseBody } from '../../../../shared/api-contracts';

export type PauseDurationOption = 'manual' | 'one_day' | 'three_days' | 'seven_days' | 'custom';

type PausePayloadErrorKey =
  | 'meds.pauseCustomDateRequired'
  | 'meds.pauseCustomDateInvalid'
  | 'meds.pauseCustomDatePast';

type PausePayloadResult =
  | { body: MedicationPauseBody }
  | { errorKey: PausePayloadErrorKey };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const PRESET_HOURS: Partial<Record<PauseDurationOption, number>> = {
  one_day: 24,
  three_days: 72,
  seven_days: 168,
};

function normalizeReason(reason: string): string | null {
  const trimmed = reason.trim();
  return trimmed ? trimmed : null;
}

function customDateToPauseUntil(input: string, now: Date): string | PausePayloadErrorKey {
  const raw = input.trim();
  if (!raw) return 'meds.pauseCustomDateRequired';
  const match = DATE_RE.exec(raw);
  if (!match) return 'meds.pauseCustomDateInvalid';

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const until = new Date(year, month - 1, day, 23, 59, 0, 0);
  if (
    until.getFullYear() !== year
    || until.getMonth() !== month - 1
    || until.getDate() !== day
  ) {
    return 'meds.pauseCustomDateInvalid';
  }
  if (until.getTime() <= now.getTime()) return 'meds.pauseCustomDatePast';
  return until.toISOString();
}

export function buildMedicationPauseBody(
  duration: PauseDurationOption,
  customUntilDate: string,
  reason: string,
  now = new Date(),
): PausePayloadResult {
  const pause_reason = normalizeReason(reason);
  if (duration === 'manual') {
    return { body: { pause_until: null, pause_reason } };
  }
  if (duration === 'custom') {
    const pauseUntil = customDateToPauseUntil(customUntilDate, now);
    if (pauseUntil.startsWith('meds.')) return { errorKey: pauseUntil as PausePayloadErrorKey };
    return { body: { pause_until: pauseUntil, pause_reason } };
  }

  const hours = PRESET_HOURS[duration] ?? PRESET_HOURS.three_days;
  return {
    body: {
      pause_until: new Date(now.getTime() + Number(hours) * 60 * 60 * 1000).toISOString(),
      pause_reason,
    },
  };
}
