export const MIN_WEIGHT_GOAL_KG = 30;
export const MAX_WEIGHT_GOAL_KG = 200;

const DECIMAL_WEIGHT_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

export function parseWeightGoalTarget(value: string): number | null {
  const trimmed = value.trim();
  if (!DECIMAL_WEIGHT_PATTERN.test(trimmed)) return null;

  const parsed = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  if (parsed < MIN_WEIGHT_GOAL_KG || parsed > MAX_WEIGHT_GOAL_KG) return null;

  return Number(parsed.toFixed(1));
}
