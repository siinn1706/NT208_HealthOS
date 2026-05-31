export interface HealthGoalFormValues {
  targetWeightKg: string;
  deadline: string;
}

export type HealthGoalValidationResult =
  | {
      ok: true;
      payload: {
        target_weight_kg: number;
        deadline: string | null;
      };
    }
  | {
      ok: false;
      messageKey: "targetWeightRequired" | "targetWeightRange" | "deadlineMustBeTodayOrFuture";
    };

export function getLocalDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDateInputValue(value: string): string | null {
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export function validateHealthGoalForm(
  values: HealthGoalFormValues,
  today = getLocalDateInputValue()
): HealthGoalValidationResult {
  const rawTargetWeight = values.targetWeightKg.trim();
  if (!rawTargetWeight) {
    return { ok: false, messageKey: "targetWeightRequired" };
  }

  const targetWeightKg = Number(rawTargetWeight);
  if (!Number.isFinite(targetWeightKg)) {
    return { ok: false, messageKey: "targetWeightRequired" };
  }

  if (targetWeightKg < 30 || targetWeightKg > 200) {
    return { ok: false, messageKey: "targetWeightRange" };
  }

  const deadline = normalizeDateInputValue(values.deadline);
  if (deadline != null && deadline < today) {
    return { ok: false, messageKey: "deadlineMustBeTodayOrFuture" };
  }

  return {
    ok: true,
    payload: {
      target_weight_kg: targetWeightKg,
      deadline,
    },
  };
}
