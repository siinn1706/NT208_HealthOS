export const HEALTH_CONNECT_PROVIDER = 'health_connect' as const;

export const HEALTH_CONNECT_RECORD_TYPES = [
  'Steps',
  'HeartRate',
  'SleepSession',
  'Weight',
  'BloodPressure',
  'ExerciseSession',
] as const;

export type HealthConnectRecordType = (typeof HEALTH_CONNECT_RECORD_TYPES)[number];

const HEALTH_CONNECT_RECORD_TYPE_SET = new Set<string>(HEALTH_CONNECT_RECORD_TYPES);

export function isHealthConnectRecordType(value: string): value is HealthConnectRecordType {
  return HEALTH_CONNECT_RECORD_TYPE_SET.has(value);
}

export function normalizeHealthConnectRecordTypes(values: string[] | null | undefined): HealthConnectRecordType[] {
  const unique = new Set<HealthConnectRecordType>();
  for (const raw of values ?? []) {
    const normalized = raw.trim();
    if (!isHealthConnectRecordType(normalized)) continue;
    unique.add(normalized);
  }
  return Array.from(unique).sort();
}
