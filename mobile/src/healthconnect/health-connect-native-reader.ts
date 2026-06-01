import type { GetChangesRequest, ReadRecordsOptions, RecordType } from 'react-native-health-connect';
import type { HealthDeletionIn, HealthRecordIn } from '../api/services/device-service';
import type { HealthConnectReadChangesInput, HealthConnectReadChangesResult } from './orchestrator';
import { normalizeHealthConnectRecordTypes, type HealthConnectRecordType } from './types';
import {
  mapHealthConnectDeletionToIngestDeletions,
  mapHealthConnectRecordToIngestRecords,
} from './health-connect-record-mapper';

type HealthConnectNativeModule = typeof import('react-native-health-connect');

interface NativeReaderOptions {
  now: () => Date;
  backfillDays: number;
}

interface ChangesPage {
  records: HealthRecordIn[];
  deletions: HealthDeletionIn[];
  nextToken: string | null;
  expired: boolean;
}

const READ_PAGE_SIZE = 500;
const MAX_CHANGE_PAGES = 25;
const MAX_READ_PAGES = 25;

export async function readNativeHealthConnectChanges(
  module: HealthConnectNativeModule,
  input: HealthConnectReadChangesInput,
  options: NativeReaderOptions,
): Promise<HealthConnectReadChangesResult> {
  const records: HealthRecordIn[] = [];
  const deletions: HealthDeletionIn[] = [];
  const nextChangesTokens: Record<string, string | null> = {};
  const grantedTypes = normalizeHealthConnectRecordTypes(input.grantedPermissions);

  for (const recordType of grantedTypes) {
    const result = await readRecordTypeChanges(
      module,
      recordType,
      input.currentTokens[recordType],
      options,
    );
    records.push(...result.records);
    deletions.push(...result.deletions);
    nextChangesTokens[recordType] = result.nextToken;
  }

  return {
    records: dedupeByExternalId(records),
    deletions: dedupeByExternalId(deletions),
    nextChangesTokens,
  };
}

async function readRecordTypeChanges(
  module: HealthConnectNativeModule,
  recordType: HealthConnectRecordType,
  currentToken: string | null | undefined,
  options: NativeReaderOptions,
): Promise<ChangesPage> {
  const token = currentToken?.trim();
  if (token) {
    const delta = await readAllChangePages(module, { changesToken: token }, recordType);
    if (!delta.expired) return delta;
  }

  const fresh = await readAllChangePages(module, { recordTypes: [recordType as RecordType] }, recordType);
  const backfill = await readBackfillRecords(module, recordType, options);
  return {
    records: [...backfill, ...fresh.records],
    deletions: fresh.deletions,
    nextToken: fresh.nextToken,
    expired: fresh.expired,
  };
}

async function readAllChangePages(
  module: HealthConnectNativeModule,
  request: GetChangesRequest,
  recordType: HealthConnectRecordType,
): Promise<ChangesPage> {
  const records: HealthRecordIn[] = [];
  const deletions: HealthDeletionIn[] = [];
  let nextRequest = request;
  let nextToken: string | null = null;

  for (let page = 0; page < MAX_CHANGE_PAGES; page += 1) {
    const result = await module.getChanges(nextRequest);
    if (result.changesTokenExpired) {
      return { records: [], deletions: [], nextToken: null, expired: true };
    }
    records.push(...result.upsertionChanges.flatMap(({ record }) => (
      mapHealthConnectRecordToIngestRecords(record, recordType)
    )));
    deletions.push(...result.deletionChanges.flatMap(({ recordId }) => (
      mapHealthConnectDeletionToIngestDeletions(recordId, recordType)
    )));
    nextToken = result.nextChangesToken?.trim() || null;
    if (!result.hasMore) return { records, deletions, nextToken, expired: false };
    if (!nextToken) break;
    nextRequest = { changesToken: nextToken };
  }

  throw new Error('Health Connect returned too many change pages for one sync.');
}

async function readBackfillRecords(
  module: HealthConnectNativeModule,
  recordType: HealthConnectRecordType,
  options: NativeReaderOptions,
): Promise<HealthRecordIn[]> {
  const end = options.now();
  const start = new Date(end.getTime() - options.backfillDays * 24 * 60 * 60 * 1000);
  const records: HealthRecordIn[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_READ_PAGES; page += 1) {
    const readOptions: ReadRecordsOptions = {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      ascendingOrder: true,
      pageSize: READ_PAGE_SIZE,
      ...(pageToken ? { pageToken } : {}),
    };
    const result = await module.readRecords(recordType as RecordType, readOptions);
    records.push(...result.records.flatMap((record) => (
      mapHealthConnectRecordToIngestRecords(record, recordType)
    )));
    pageToken = result.pageToken?.trim() || undefined;
    if (!pageToken) return records;
  }

  throw new Error('Health Connect returned too many historical record pages for one sync.');
}

function dedupeByExternalId<T extends { external_id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.external_id, item])).values());
}
