export type RawObject = Record<string, unknown>;

export function asObject(value: unknown): RawObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RawObject : null;
}

export function getObject(record: RawObject | null, key: string): RawObject | null {
  return record ? asObject(record[key]) : null;
}

export function getArray(record: RawObject, key: string): unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

export function getString(record: RawObject | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

export function getNumber(record: RawObject | null, key: string): number | null {
  const value = record?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function trimString(value: string | null | undefined, max = 128): string | null {
  const cleaned = value?.trim();
  if (!cleaned) return null;
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function compact<T>(items: (T | null)[]): T[] {
  return items.filter((item): item is T => item != null);
}
