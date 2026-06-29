import { Platform } from 'react-native';
import {
  initialize,
  getGrantedPermissions as hcGetGrantedPermissions,
  requestPermission,
  getChanges,
} from 'react-native-health-connect';
import { isHealthConnectRecordType, type HealthConnectRecordType } from './types';
import type {
  HealthConnectReadChangesInput,
  HealthConnectReadChangesResult,
  HealthConnectSyncAdapter,
} from './orchestrator';
import type { HealthDeletionIn, HealthRecordIn } from '../api/services/device-service';

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  const available = await initialize();
  if (!available) {
    throw new Error('Health Connect is not available on this device.');
  }
  initialized = true;
}

function massToKg(mass: { value: number; unit: string }): number {
  switch (mass.unit) {
    case 'kilograms': return mass.value;
    case 'grams': return mass.value / 1_000;
    case 'milligrams': return mass.value / 1_000_000;
    case 'micrograms': return mass.value / 1_000_000_000;
    case 'pounds': return mass.value * 0.453_592;
    case 'ounces': return mass.value * 0.028_349_5;
    default: return mass.value;
  }
}

function durationMinutes(startTime: string, endTime: string): number {
  return (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRecord(record: any): HealthRecordIn[] {
  const id: string = record.metadata?.id ?? '';
  const origin: string | null = record.metadata?.dataOrigin ?? null;

  switch (record.recordType as HealthConnectRecordType) {
    case 'Steps':
      return [{
        external_id: id,
        metric_type: 'steps',
        value: record.count as number,
        unit: 'count',
        recorded_at: record.startTime as string,
        source_app: origin,
      }];

    case 'HeartRate':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (record.samples as any[]).map((sample, index) => ({
        external_id: `${id}-${index}`,
        metric_type: 'heart_rate',
        value: sample.beatsPerMinute as number,
        unit: 'bpm',
        recorded_at: sample.time as string,
        source_app: origin,
      }));

    case 'SleepSession':
      return [{
        external_id: id,
        metric_type: 'sleep_duration',
        value: durationMinutes(record.startTime as string, record.endTime as string),
        unit: 'min',
        recorded_at: record.startTime as string,
        source_app: origin,
      }];

    case 'Weight':
      return [{
        external_id: id,
        metric_type: 'weight',
        value: massToKg(record.weight as { value: number; unit: string }),
        unit: 'kg',
        recorded_at: record.time as string,
        source_app: origin,
      }];

    case 'BloodPressure':
      return [
        {
          external_id: `${id}-sys`,
          metric_type: 'blood_pressure_systolic',
          value: (record.systolic as { value: number }).value,
          unit: 'mmHg',
          recorded_at: record.time as string,
          source_app: origin,
        },
        {
          external_id: `${id}-dia`,
          metric_type: 'blood_pressure_diastolic',
          value: (record.diastolic as { value: number }).value,
          unit: 'mmHg',
          recorded_at: record.time as string,
          source_app: origin,
        },
      ];

    case 'ExerciseSession':
      return [{
        external_id: id,
        metric_type: 'exercise_duration',
        value: durationMinutes(record.startTime as string, record.endTime as string),
        unit: 'min',
        recorded_at: record.startTime as string,
        source_app: origin,
      }];

    default:
      return [];
  }
}

async function fetchAllChangesForType(
  recordType: HealthConnectRecordType,
  storedToken: string | null,
): Promise<{ records: HealthRecordIn[]; deletions: HealthDeletionIn[]; nextToken: string | null }> {
  const records: HealthRecordIn[] = [];
  const deletions: HealthDeletionIn[] = [];

  // When no stored token, start a new tracking token scoped to this record type.
  // When a token exists, its record-type scope is already encoded — omit recordTypes.
  let request = storedToken != null
    ? { changesToken: storedToken }
    : { recordTypes: [recordType] };
  let keepFetching = true;
  let lastToken: string | null = storedToken;

  while (keepFetching) {
    const result = await getChanges(request);

    if (result.changesTokenExpired) {
      // Signal orchestrator to reset this type's token and re-sync from scratch.
      return { records: [], deletions: [], nextToken: null };
    }

    for (const { record } of result.upsertionChanges) {
      records.push(...mapRecord(record));
    }

    for (const { recordId } of result.deletionChanges) {
      deletions.push({ external_id: recordId });
    }

    lastToken = result.nextChangesToken ?? lastToken;
    keepFetching = result.hasMore;
    if (keepFetching) {
      request = { changesToken: result.nextChangesToken };
    }
  }

  return { records, deletions, nextToken: lastToken };
}

export async function requestHealthConnectPermissions(scopes: string[]): Promise<string[]> {
  if (Platform.OS !== 'android') return [];
  await ensureInitialized();
  const permissions = scopes
    .filter(isHealthConnectRecordType)
    .map((recordType) => ({ recordType, accessType: 'read' as const }));
  if (permissions.length === 0) return [];
  const granted = await requestPermission(permissions);
  return granted.map((p) => p.recordType);
}

export function createNativeHealthConnectAdapter(): HealthConnectSyncAdapter {
  return {
    async getGrantedPermissions(): Promise<string[]> {
      await ensureInitialized();
      const permissions = await hcGetGrantedPermissions();
      return permissions.map((p) => p.recordType);
    },

    async readChanges(input: HealthConnectReadChangesInput): Promise<HealthConnectReadChangesResult> {
      await ensureInitialized();

      const allRecords: HealthRecordIn[] = [];
      const allDeletions: HealthDeletionIn[] = [];
      const nextChangesTokens: Record<string, string | null> = {};

      for (const recordType of input.grantedPermissions) {
        const storedToken = input.currentTokens[recordType] ?? null;
        const { records, deletions, nextToken } = await fetchAllChangesForType(recordType, storedToken);
        allRecords.push(...records);
        allDeletions.push(...deletions);
        nextChangesTokens[recordType] = nextToken;
      }

      return {
        records: allRecords,
        deletions: allDeletions,
        nextChangesTokens,
      };
    },
  };
}
