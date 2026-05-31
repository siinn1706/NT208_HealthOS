const MAX_REFILL_SUPPLY_UNITS = 100000;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

export type RefillUnitsParseResult =
  | { units: number }
  | { errorKey: 'meds.refillUnitsInvalid' | 'meds.refillUnitsOutOfRange' };

export function defaultRefillUnits(currentUnits: number | null | undefined) {
  return currentUnits !== null && currentUnits !== undefined && currentUnits > 0 ? currentUnits : 30;
}

export function parseRefillUnits(text: string, fallbackUnits: number): RefillUnitsParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { units: fallbackUnits };
  if (!WHOLE_NUMBER_PATTERN.test(trimmed)) return { errorKey: 'meds.refillUnitsInvalid' };
  const units = Number(trimmed);
  if (!Number.isSafeInteger(units) || units > MAX_REFILL_SUPPLY_UNITS) return { errorKey: 'meds.refillUnitsOutOfRange' };
  return { units };
}
