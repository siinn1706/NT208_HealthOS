import type { MedicationDose } from '../../../../shared/api-contracts';

type DoseActionIntent = 'take' | 'missed';

interface DoseActionTargetParams {
  medicationPlanId: string;
  intent: DoseActionIntent;
  occurrenceId?: string | null;
  reminderId?: string | null;
  scheduledAt?: string | null;
}

export function firstRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function doseActionRoute(planId: string, dose?: MedicationDose | null, intent: DoseActionIntent = 'take') {
  const action = intent === 'missed' ? 'missed' : 'take';
  if (!dose) return `/meds/${encodeURIComponent(planId)}/${action}`;
  const params = new URLSearchParams({
    occurrenceId: dose.occurrence_id,
    reminderId: dose.reminder_id,
    scheduledAt: dose.scheduled_at,
  });
  return `/meds/${encodeURIComponent(planId)}/${action}?${params.toString()}`;
}

export function selectMedicationDoseActionTarget(
  doses: MedicationDose[] | null | undefined,
  params: DoseActionTargetParams,
) {
  const samePlan = (doses ?? []).filter((dose) => dose.medication_plan_id === params.medicationPlanId);
  const actionable = samePlan.filter((dose) => isActionableStatus(dose.status, params.intent));

  if (params.occurrenceId) {
    return actionable.find((dose) => {
      if (dose.occurrence_id !== params.occurrenceId) return false;
      return params.reminderId ? dose.reminder_id === params.reminderId : true;
    }) ?? null;
  }

  let candidates = actionable;
  if (params.reminderId) {
    candidates = candidates.filter((dose) => dose.reminder_id === params.reminderId);
  }
  if (params.scheduledAt) {
    candidates = candidates.filter((dose) => dose.scheduled_at === params.scheduledAt);
  }

  return candidates.slice().sort((a, b) => {
    const statusDelta = statusRank(a.status, params.intent) - statusRank(b.status, params.intent);
    if (statusDelta !== 0) return statusDelta;
    return dateRank(a.scheduled_at) - dateRank(b.scheduled_at);
  })[0] ?? null;
}

function normalizedStatus(status: string) {
  const value = status.toLowerCase();
  if (value.includes('done') || value.includes('taken') || value.includes('completed')) return 'done';
  if (value.includes('skip')) return 'skipped';
  if (value.includes('cancel')) return 'cancelled';
  if (value.includes('miss')) return 'missed';
  if (value.includes('fire')) return 'fired';
  if (value.includes('snooz')) return 'snoozed';
  if (value.includes('pending') || value.includes('due')) return 'pending';
  return value;
}

function isActionableStatus(status: string, intent: DoseActionIntent) {
  const normalized = normalizedStatus(status);
  if (normalized === 'done' || normalized === 'skipped' || normalized === 'cancelled') return false;
  if (intent === 'missed') return normalized === 'missed' || normalized === 'fired' || normalized === 'pending' || normalized === 'snoozed';
  return normalized === 'pending' || normalized === 'fired' || normalized === 'snoozed';
}

function statusRank(status: string, intent: DoseActionIntent) {
  const normalized = normalizedStatus(status);
  const order = intent === 'missed'
    ? ['missed', 'fired', 'pending', 'snoozed']
    : ['pending', 'fired', 'snoozed'];
  const index = order.indexOf(normalized);
  return index === -1 ? order.length : index;
}

function dateRank(value: string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}
