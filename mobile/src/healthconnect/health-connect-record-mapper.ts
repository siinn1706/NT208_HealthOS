import type { HealthDeletionIn, HealthRecordIn } from '../api/services/device-service';
import { isHealthConnectRecordType, type HealthConnectRecordType } from './types';
import {
  asObject,
  compact,
  getArray,
  getNumber,
  getObject,
  getString,
  round,
  trimString,
  type RawObject,
} from './health-connect-record-utils';

const CORE_EXTERNAL_ID_MAX_LENGTH = 128;
const HEALTH_CONNECT_BACKEND_PREFIX_LENGTH = 'hc:'.length + 36 + ':'.length;
const BLOOD_PRESSURE_DIASTOLIC_SUFFIX = ':diastolic';
const MAX_EXTERNAL_ID_BASE_LENGTH = (
  CORE_EXTERNAL_ID_MAX_LENGTH
  - HEALTH_CONNECT_BACKEND_PREFIX_LENGTH
  - BLOOD_PRESSURE_DIASTOLIC_SUFFIX.length
);

const METRIC_RANGES: Record<string, [number, number]> = {
  heart_rate: [20, 300],
  steps: [0, 200000],
  sleep_minutes: [0, 1440],
  weight_kg: [1, 500],
  blood_pressure_systolic: [50, 300],
  blood_pressure_diastolic: [30, 200],
  exercise_session_minutes: [0, 1440],
};

export function mapHealthConnectRecordToIngestRecords(
  value: unknown,
  fallbackType?: HealthConnectRecordType,
): HealthRecordIn[] {
  const record = asObject(value);
  if (!record) return [];
  const recordType = getRecordType(record, fallbackType);
  if (!recordType) return [];

  switch (recordType) {
    case 'Steps':
      return compact([createRecord(record, 'steps', getNumber(record, 'count'), 'count')]);
    case 'HeartRate':
      return compact([createRecord(record, 'heart_rate', averageHeartRate(record), 'bpm')]);
    case 'SleepSession':
      return compact([createRecord(record, 'sleep_minutes', durationMinutes(record), 'min')]);
    case 'Weight':
      return compact([createRecord(record, 'weight_kg', massKg(getObject(record, 'weight')), 'kg')]);
    case 'BloodPressure':
      return compact([
        createRecord(record, 'blood_pressure_systolic', pressureMmHg(getObject(record, 'systolic')), 'mmHg', 'systolic'),
        createRecord(record, 'blood_pressure_diastolic', pressureMmHg(getObject(record, 'diastolic')), 'mmHg', 'diastolic'),
      ]);
    case 'ExerciseSession':
      return compact([createRecord(record, 'exercise_session_minutes', durationMinutes(record), 'min')]);
    default:
      return [];
  }
}

export function mapHealthConnectDeletionToIngestDeletions(
  recordId: string,
  recordType: HealthConnectRecordType,
): HealthDeletionIn[] {
  const baseId = normalizeExternalId(recordId);
  if (!baseId) return [];
  if (recordType === 'BloodPressure') {
    return [{ external_id: `${baseId}:systolic` }, { external_id: `${baseId}${BLOOD_PRESSURE_DIASTOLIC_SUFFIX}` }];
  }
  return [{ external_id: baseId }];
}

function createRecord(
  record: RawObject,
  metricType: string,
  rawValue: number | null,
  unit: string,
  suffix?: string,
): HealthRecordIn | null {
  if (rawValue == null || !Number.isFinite(rawValue)) return null;
  const value = round(rawValue);
  if (!isWithinRange(metricType, value)) return null;
  const recordedAt = getRecordedAt(record);
  if (!recordedAt) return null;
  const externalId = buildExternalId(record, suffix);
  if (!externalId) return null;
  return {
    external_id: externalId,
    external_version: getExternalVersion(record, recordedAt),
    metric_type: metricType,
    value,
    unit,
    recorded_at: recordedAt,
    source: 'health_connect',
    source_app: trimString(getString(getObject(record, 'metadata'), 'dataOrigin'), 128),
    recording_method: getRecordingMethod(record),
  };
}

function getRecordType(record: RawObject, fallbackType?: HealthConnectRecordType): HealthConnectRecordType | null {
  const rawType = getString(record, 'recordType') ?? fallbackType;
  return rawType && isHealthConnectRecordType(rawType) ? rawType : null;
}

function buildExternalId(record: RawObject, suffix?: string): string | null {
  const metadata = getObject(record, 'metadata');
  const raw = getString(metadata, 'id')
    ?? getString(metadata, 'clientRecordId')
    ?? fallbackExternalId(record);
  const base = normalizeExternalId(raw);
  if (!base) return null;
  return suffix ? `${base}:${suffix}` : base;
}

function fallbackExternalId(record: RawObject): string | null {
  const recordType = getString(record, 'recordType') ?? 'HealthConnect';
  const start = getString(record, 'startTime') ?? getString(record, 'time');
  const end = getString(record, 'endTime') ?? start;
  return start ? `${recordType}:${start}:${end ?? ''}` : null;
}

function getRecordedAt(record: RawObject): string | null {
  const raw = getString(record, 'time') ?? getString(record, 'endTime') ?? getString(record, 'startTime');
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getExternalVersion(record: RawObject, recordedAt: string): number | null {
  const metadata = getObject(record, 'metadata');
  const clientVersion = getNumber(metadata, 'clientRecordVersion');
  if (clientVersion != null && clientVersion >= 0) return Math.floor(clientVersion);
  const modifiedAt = getString(metadata, 'lastModifiedTime');
  const modifiedEpoch = modifiedAt ? Date.parse(modifiedAt) : Number.NaN;
  if (Number.isFinite(modifiedEpoch) && modifiedEpoch >= 0) return Math.floor(modifiedEpoch);
  return Math.floor(Date.parse(recordedAt));
}

function getRecordingMethod(record: RawObject): string | null {
  const method = getNumber(getObject(record, 'metadata'), 'recordingMethod');
  if (method === 1) return 'active';
  if (method === 2) return 'auto';
  if (method === 3) return 'manual';
  return method == null ? null : 'unknown';
}

function averageHeartRate(record: RawObject): number | null {
  const samples = getArray(record, 'samples');
  const values = samples
    .map((sample) => getNumber(asObject(sample), 'beatsPerMinute'))
    .filter((item): item is number => item != null && Number.isFinite(item));
  if (values.length === 0) return null;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function durationMinutes(record: RawObject): number | null {
  const start = getString(record, 'startTime');
  const end = getString(record, 'endTime');
  if (!start || !end) return null;
  const diffMs = Date.parse(end) - Date.parse(start);
  return Number.isFinite(diffMs) && diffMs >= 0 ? diffMs / 60000 : null;
}

function massKg(value: RawObject | null): number | null {
  if (!value) return null;
  const kg = getNumber(value, 'inKilograms');
  if (kg != null) return kg;
  const raw = getNumber(value, 'value');
  const unit = getString(value, 'unit');
  if (raw == null) return null;
  if (unit === 'grams') return raw / 1000;
  if (unit === 'milligrams') return raw / 1_000_000;
  if (unit === 'micrograms') return raw / 1_000_000_000;
  if (unit === 'ounces') return raw * 0.028349523125;
  if (unit === 'pounds') return raw * 0.45359237;
  return raw;
}

function pressureMmHg(value: RawObject | null): number | null {
  return value ? getNumber(value, 'inMillimetersOfMercury') ?? getNumber(value, 'value') : null;
}

function isWithinRange(metricType: string, value: number): boolean {
  const range = METRIC_RANGES[metricType];
  return !range || (value >= range[0] && value <= range[1]);
}

function normalizeExternalId(value: string | null): string | null {
  const cleaned = trimString(value?.replace(/\s+/g, ' '), MAX_EXTERNAL_ID_BASE_LENGTH);
  return cleaned || null;
}
