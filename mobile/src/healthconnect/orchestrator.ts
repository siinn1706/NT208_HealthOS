import {
  deviceService,
  type ConnectedDevice,
  type DeviceSyncState,
  type HealthDeletionIn,
  type HealthIngestBatch,
  type HealthIngestResult,
  type HealthRecordIn,
} from '../api/services/device-service';
import {
  HEALTH_CONNECT_PROVIDER,
  normalizeHealthConnectRecordTypes,
  type HealthConnectRecordType,
  isHealthConnectRecordType,
} from './types';
import {
  getHealthConnectExternalAccountId,
  getStoredHealthConnectDeviceId,
  saveHealthConnectDeviceId,
} from './health-connect-external-account-id';

const MAX_BATCH_ITEMS = 500;
const MAX_BATCH_BYTES = 256 * 1024;
const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_DEVICE_LABEL = 'Health Connect';
const SEED_SYNC_TOKEN_PREFIX = 'healthos.seed_health_data.';

type MaybeToken = string | null | undefined;

export interface HealthConnectReadChangesInput {
  currentTokens: Record<string, string | null>;
  grantedPermissions: HealthConnectRecordType[];
}

export interface HealthConnectReadChangesResult {
  records?: HealthRecordIn[];
  deletions?: HealthDeletionIn[];
  nextChangesTokens?: Record<string, MaybeToken>;
}

export interface HealthConnectSyncAdapter {
  getGrantedPermissions: () => Promise<string[]>;
  readChanges: (input: HealthConnectReadChangesInput) => Promise<HealthConnectReadChangesResult>;
}

export interface BuildHealthIngestBatchesInput {
  provider?: string;
  records?: HealthRecordIn[];
  deletions?: HealthDeletionIn[];
  nextChangesTokens?: Record<string, string>;
}

interface SanitizedNextTokens {
  ingestTokens: Record<string, string>;
  resetTokens: Record<string, null>;
}

export interface SyncHealthConnectOptions {
  deviceId?: string;
  maxBatchAttempts?: number;
}

export interface SyncHealthConnectResult {
  deviceId: string;
  idempotencyKeys: string[];
  batchCount: number;
  permissionsPatched: boolean;
  resetSyncTypes: string[];
  ingest: HealthIngestResult;
}

export interface ResetHealthConnectSyncStateOptions {
  deviceId?: string;
  recordTypes?: string[];
}

export interface ResetHealthConnectSyncStateResult {
  deviceId: string;
  resetTypes: string[];
}

export async function syncHealthConnect(
  adapter: HealthConnectSyncAdapter,
  options: SyncHealthConnectOptions = {},
): Promise<SyncHealthConnectResult> {
  const device = await resolveHealthConnectDevice(options.deviceId);
  const [syncStateRows, grantedPermissionsRaw] = await Promise.all([
    deviceService.getSyncState(device.id),
    adapter.getGrantedPermissions(),
  ]);

  const grantedPermissions = normalizeHealthConnectRecordTypes(grantedPermissionsRaw);
  const storedScopes = normalizeHealthConnectRecordTypes(device.scopes);
  const permissionsPatched = !areEqualStringArrays(grantedPermissions, storedScopes);
  if (permissionsPatched) {
    await deviceService.patchPermissions(device.id, grantedPermissions);
  }

  const currentTokens = toSyncTokenMap(syncStateRows);
  const changes = await adapter.readChanges({ currentTokens, grantedPermissions });
  const sanitizedTokens = sanitizeNextChangesTokens(changes.nextChangesTokens);
  const batches = buildHealthIngestBatches({
    provider: HEALTH_CONNECT_PROVIDER,
    records: changes.records ?? [],
    deletions: changes.deletions ?? [],
    nextChangesTokens: sanitizedTokens.ingestTokens,
  });

  const maxBatchAttempts = Math.max(1, options.maxBatchAttempts ?? DEFAULT_RETRY_ATTEMPTS);
  const ingest: HealthIngestResult = {
    inserted: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    errors: [],
  };
  const idempotencyKeys: string[] = [];

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const idempotencyKey = buildBatchIdempotencyKey(device.id, index, batch);
    idempotencyKeys.push(idempotencyKey);
    const result = await ingestBatchWithRetry(device.id, batch, idempotencyKey, maxBatchAttempts);
    ingest.inserted += result.inserted;
    ingest.updated += result.updated;
    ingest.deleted += result.deleted;
    ingest.skipped += result.skipped;
    ingest.errors.push(...result.errors);
  }

  const resetTypes = Object.keys(sanitizedTokens.resetTokens);
  if (resetTypes.length > 0) {
    await deviceService.putSyncState(device.id, sanitizedTokens.resetTokens);
  }

  return {
    deviceId: device.id,
    idempotencyKeys,
    batchCount: batches.length,
    permissionsPatched,
    resetSyncTypes: resetTypes,
    ingest,
  };
}

export async function resetHealthConnectSyncState(
  options: ResetHealthConnectSyncStateOptions = {},
): Promise<ResetHealthConnectSyncStateResult> {
  const device = await resolveHealthConnectDevice(options.deviceId);
  let recordTypes = normalizeHealthConnectRecordTypes(options.recordTypes);
  if (recordTypes.length === 0) {
    const syncState = await deviceService.getSyncState(device.id);
    recordTypes = normalizeHealthConnectRecordTypes(syncState.map((entry) => entry.record_type));
  }
  if (recordTypes.length === 0) {
    return { deviceId: device.id, resetTypes: [] };
  }
  const payload = Object.fromEntries(recordTypes.map((recordType) => [recordType, null])) as Record<string, null>;
  await deviceService.putSyncState(device.id, payload);
  return { deviceId: device.id, resetTypes: recordTypes };
}

export function buildHealthIngestBatches(input: BuildHealthIngestBatchesInput): HealthIngestBatch[] {
  const provider = input.provider ?? HEALTH_CONNECT_PROVIDER;
  const records = input.records ?? [];
  const deletions = input.deletions ?? [];
  const nextTokens = input.nextChangesTokens ?? {};
  const batches: HealthIngestBatch[] = [];
  let currentRecords: HealthRecordIn[] = [];
  let currentDeletions: HealthDeletionIn[] = [];

  const flushCurrent = () => {
    const batch = createBatch(provider, currentRecords, currentDeletions);
    if (!batch) return;
    batches.push(batch);
    currentRecords = [];
    currentDeletions = [];
  };

  for (const record of records) {
    const candidateRecords = [...currentRecords, record];
    if (candidateRecords.length + currentDeletions.length > MAX_BATCH_ITEMS) {
      flushCurrent();
      currentRecords = [record];
      if (estimateJsonBytes(createBatch(provider, currentRecords, currentDeletions) ?? {}) > MAX_BATCH_BYTES) {
        throw new Error('Single Health Connect record exceeds ingest payload limit.');
      }
      continue;
    }
    const candidateBatch = createBatch(provider, candidateRecords, currentDeletions);
    if (estimateJsonBytes(candidateBatch ?? {}) <= MAX_BATCH_BYTES) {
      currentRecords = candidateRecords;
      continue;
    }
    flushCurrent();
    currentRecords = [record];
    if (estimateJsonBytes(createBatch(provider, currentRecords, currentDeletions) ?? {}) > MAX_BATCH_BYTES) {
      throw new Error('Single Health Connect record exceeds ingest payload limit.');
    }
  }

  for (const deletion of deletions) {
    const candidateDeletions = [...currentDeletions, deletion];
    if (currentRecords.length + candidateDeletions.length > MAX_BATCH_ITEMS) {
      flushCurrent();
      currentDeletions = [deletion];
      if (estimateJsonBytes(createBatch(provider, currentRecords, currentDeletions) ?? {}) > MAX_BATCH_BYTES) {
        throw new Error('Single Health Connect deletion exceeds ingest payload limit.');
      }
      continue;
    }
    const candidateBatch = createBatch(provider, currentRecords, candidateDeletions);
    if (estimateJsonBytes(candidateBatch ?? {}) <= MAX_BATCH_BYTES) {
      currentDeletions = candidateDeletions;
      continue;
    }
    flushCurrent();
    currentDeletions = [deletion];
    if (estimateJsonBytes(createBatch(provider, currentRecords, currentDeletions) ?? {}) > MAX_BATCH_BYTES) {
      throw new Error('Single Health Connect deletion exceeds ingest payload limit.');
    }
  }

  flushCurrent();

  if (Object.keys(nextTokens).length > 0) {
    const tokenBatch: HealthIngestBatch = {
      provider,
      next_changes_tokens: nextTokens,
    };
    if (batches.length === 0) {
      if (estimateJsonBytes(tokenBatch) > MAX_BATCH_BYTES) {
        throw new Error('Health Connect token payload exceeds ingest payload limit.');
      }
      batches.push(tokenBatch);
    } else {
      const merged = { ...batches[batches.length - 1], next_changes_tokens: nextTokens };
      if (estimateJsonBytes(merged) <= MAX_BATCH_BYTES) {
        batches[batches.length - 1] = merged;
      } else {
        if (estimateJsonBytes(tokenBatch) > MAX_BATCH_BYTES) {
          throw new Error('Health Connect token payload exceeds ingest payload limit.');
        }
        batches.push(tokenBatch);
      }
    }
  }

  return batches;
}

export function sanitizeNextChangesTokens(tokens?: Record<string, MaybeToken>): SanitizedNextTokens {
  const ingestTokens: Record<string, string> = {};
  const resetTokens: Record<string, null> = {};
  for (const [rawType, rawToken] of Object.entries(tokens ?? {})) {
    const recordType = rawType.trim();
    if (!isHealthConnectRecordType(recordType)) continue;
    if (typeof rawToken === 'string') {
      const token = rawToken.trim();
      if (token.length > 0) ingestTokens[recordType] = token;
      else resetTokens[recordType] = null;
      continue;
    }
    if (rawToken === null) {
      resetTokens[recordType] = null;
    }
  }
  return { ingestTokens, resetTokens };
}

export function buildBatchIdempotencyKey(deviceId: string, batchIndex: number, batch: HealthIngestBatch) {
  const material = `${deviceId}|${batchIndex}|${stableStringify(batch)}`;
  const hash = fnv1a32(material);
  const compactDeviceId = deviceId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'dev';
  return `hc-${compactDeviceId}-${batchIndex}-${hash}`;
}

export function estimateJsonBytes(value: unknown): number {
  return utf8ByteLength(JSON.stringify(value ?? {}));
}

function createBatch(provider: string, records: HealthRecordIn[], deletions: HealthDeletionIn[]): HealthIngestBatch | null {
  if (records.length === 0 && deletions.length === 0) return null;
  const batch: HealthIngestBatch = { provider };
  if (records.length > 0) batch.records = records;
  if (deletions.length > 0) batch.deletions = deletions;
  return batch;
}

function toSyncTokenMap(syncStateRows: DeviceSyncState[]) {
  return syncStateRows.reduce<Record<string, string | null>>((acc, row) => {
    acc[row.record_type] = isSeedSyncToken(row.changes_token) ? null : row.changes_token;
    return acc;
  }, {});
}

function isSeedSyncToken(token: string | null) {
  return typeof token === 'string' && token.startsWith(SEED_SYNC_TOKEN_PREFIX);
}

async function resolveHealthConnectDevice(deviceId?: string): Promise<ConnectedDevice> {
  const devices = await deviceService.list();
  if (deviceId) {
    const exact = devices.find((device) => device.id === deviceId);
    if (!exact) {
      throw new Error('Selected Health Connect device is no longer available.');
    }
    if (exact.provider !== HEALTH_CONNECT_PROVIDER) {
      throw new Error('Selected device is not a Health Connect device.');
    }
    return exact;
  }

  const storedDeviceId = await getStoredHealthConnectDeviceId();
  const storedDevice = storedDeviceId ? devices.find((device) => device.id === storedDeviceId) : undefined;
  if (storedDevice?.provider === HEALTH_CONNECT_PROVIDER && storedDevice.connected) return storedDevice;

  const externalAccountId = await getHealthConnectExternalAccountId();
  const device = await deviceService.connect({
    provider: HEALTH_CONNECT_PROVIDER,
    device_label: storedDevice?.device_label ?? DEFAULT_DEVICE_LABEL,
    external_account_id: externalAccountId,
    scopes: storedDevice?.scopes,
  });
  if (device.id !== storedDeviceId) {
    await saveHealthConnectDeviceId(device.id);
  }
  return device;
}

async function ingestBatchWithRetry(
  deviceId: string,
  batch: HealthIngestBatch,
  idempotencyKey: string,
  maxAttempts: number,
): Promise<HealthIngestResult> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await deviceService.ingest(deviceId, batch, idempotencyKey);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Health Connect batch ingest failed.');
}

function areEqualStringArrays(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function stableStringify(value: unknown) {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (!value || typeof value !== 'object') return value;
  const objectValue = value as Record<string, unknown>;
  const sortedKeys = Object.keys(objectValue).sort();
  const output: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    output[key] = sortKeysDeep(objectValue[key]);
  }
  return output;
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function utf8ByteLength(input: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(input).length;
  }
  let count = 0;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    if (code <= 0x7f) {
      count += 1;
      continue;
    }
    if (code <= 0x7ff) {
      count += 2;
      continue;
    }
    if (code >= 0xd800 && code <= 0xdbff) {
      count += 4;
      index += 1;
      continue;
    }
    count += 3;
  }
  return count;
}
