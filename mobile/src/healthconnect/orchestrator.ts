/**
 * The Health Connect sync orchestrator.
 *
 * One public entrypoint, `syncDevice(deviceId, options)`, that:
 *   1. Fetches the per-record-type changes tokens from Core BE.
 *   2. For each record type, calls `getChanges(token)` (or bootstraps
 *      via a 14-day windowed `readRecords` if the token is missing or
 *      expired).
 *   3. Maps every HC record into the HealthOS payload shape via the
 *      pure `mapper` module.
 *   4. POSTs the batch + new tokens to `/v1/devices/{id}/ingest` with
 *      a stable Idempotency-Key.
 *   5. Returns a `SyncRunSummary` so the caller (UI) can render counts
 *      / partial-failure banners.
 *
 * Why this lives outside the React tree: it's invoked from a TanStack
 * Query mutation, an `AppState` listener, and (Phase 4) a WorkManager
 * headless JS task. Keeping it as a plain async function means each of
 * those three callers gets the same behaviour and the same tests cover
 * all of them.
 */
import { ApiError } from "@/api/errors";
import {
  HealthIngestBatch,
  HealthIngestResult,
  HealthRecordIn,
  ingestHealthBatch,
  listSyncState,
  SyncStateEntry,
} from "@/api/endpoints/health-sync";

import { HealthConnectUnavailableError } from "./client";
import { deletionTombstone, mapRecord } from "./mapper";
import { getChanges, initChangesToken, readRecordsWindow } from "./records";
import { markForegroundSyncCompleted } from "./storage";
import {
  HealthConnectRecordType,
  MVP_RECORD_TYPES,
  HCChangesResponse,
  HCRecord,
} from "./types";

export interface SyncOptions {
  /**
   * The HC record types to sync this run. Defaults to the full MVP set
   * (Steps + HeartRate + SleepSession + Weight). The connect screen
   * narrows this to whatever the user actually granted permission for.
   */
  recordTypes?: HealthConnectRecordType[];
  /**
   * Days of history to backfill when a record type has no token yet
   * (first connect) or its token expired. 14 days matches the plan's
   * §4.4 bootstrap rule.
   */
  bootstrapDays?: number;
  /**
   * Optional override — supply a stable key when the caller wants this
   * run to dedupe with a prior in-flight retry. Defaults to a fresh
   * UUID per call (one logical sync = one Idempotency-Key).
   */
  idempotencyKey?: string;
}

export interface SyncRunSummary {
  ingest: HealthIngestResult;
  /** Per-record-type rundown for UI / telemetry. */
  perRecordType: {
    recordType: HealthConnectRecordType;
    mode: "init" | "delta" | "bootstrap" | "skipped";
    raw: number;
    mapped: number;
    deleted: number;
    nextToken: string | null;
  }[];
}

const DEFAULT_BOOTSTRAP_DAYS = 14;

/**
 * Derive a stable Idempotency-Key for a given device + 5-minute bucket.
 * A user who taps "Sync now" twice within a few seconds, or whose
 * foreground-auto-sync races their manual tap, will hit the SAME key
 * and the second call collapses to the cached envelope rather than
 * burning two HTTP round-trips and risking a 409 IDEMPOTENT_INFLIGHT
 * (code-review §L4).
 *
 * Bucket size (5 min) is intentionally smaller than the 1-hour
 * foreground debounce so we still get a fresh key for legitimate
 * "next sync run" calls.
 */
const IDEMPOTENCY_BUCKET_MS = 5 * 60 * 1000;

function defaultIdempotencyKey(deviceId: string): string {
  const bucket = Math.floor(Date.now() / IDEMPOTENCY_BUCKET_MS);
  return `hc-sync:${deviceId}:${bucket}`;
}

function tokenFor(
  states: SyncStateEntry[],
  recordType: HealthConnectRecordType
): string | null {
  return (
    states.find((s) => s.record_type === recordType)?.changes_token ?? null
  );
}

function bootstrapWindow(days: number): { startTime: string; endTime: string } {
  const now = Date.now();
  return {
    startTime: new Date(now - days * 86400 * 1000).toISOString(),
    endTime: new Date(now).toISOString(),
  };
}

interface RecordTypeResult {
  records: HealthRecordIn[];
  /** External IDs of records HC reported as deleted via getChanges. */
  deletions: string[];
  nextToken: string | null;
  mode: "init" | "delta" | "bootstrap";
  rawCount: number;
  deletedCount: number;
}

/**
 * Pull whatever the device knows about one record type, returning a
 * normalized `RecordTypeResult` ready to fold into the batch.
 *
 * Token lifecycle (matches plan §4.4):
 *   - no token  -> init a fresh one, do NOT ingest any records.
 *   - has token -> getChanges(); on `changesTokenExpired`, fall back to
 *                  a 14-day windowed read + init a new token.
 *   - getChanges may return hasMore=true; we follow the chain.
 */
async function pullRecordType(
  recordType: HealthConnectRecordType,
  existingToken: string | null,
  bootstrapDays: number
): Promise<RecordTypeResult> {
  if (!existingToken) {
    // First-time init: just grab a token and let the next sync pick up
    // anything that arrives after now. Optional initial bootstrap window
    // is handled by `bootstrapDays > 0` callers below.
    if (bootstrapDays > 0) {
      const window = bootstrapWindow(bootstrapDays);
      const raw = await readRecordsWindow(recordType, window);
      const mapped = raw.flatMap(mapRecord);
      const nextToken = await initChangesToken([recordType]);
      return {
        records: mapped,
        deletions: [],
        nextToken,
        mode: "init",
        rawCount: raw.length,
        deletedCount: 0,
      };
    }
    const nextToken = await initChangesToken([recordType]);
    return {
      records: [],
      deletions: [],
      nextToken,
      mode: "init",
      rawCount: 0,
      deletedCount: 0,
    };
  }

  // We have a token — try the cheap delta path first.
  let token: string | null = existingToken;
  const records: HealthRecordIn[] = [];
  const deletions: string[] = [];
  let rawCount = 0;
  let deletedCount = 0;
  let nextToken: string | null = existingToken;
  let pages = 0;

  while (token) {
    let response: HCChangesResponse;
    try {
      response = await getChanges(token);
    } catch (err) {
      // Surface the failure to the caller; the orchestrator will write
      // a `mark_failed` audit entry on its way out.
      throw new HealthSyncError("HC_GETCHANGES_FAILED", err);
    }

    if (response.changesTokenExpired) {
      // Plan §4.4 fallback — drop the token, do a 14-day window, init
      // a new token. The backend dedupe key on `external_id` makes this
      // safe to re-run.
      const window = bootstrapWindow(bootstrapDays);
      const raw = await readRecordsWindow(recordType, window);
      const mapped = raw.flatMap(mapRecord);
      const fresh = await initChangesToken([recordType]);
      return {
        records: mapped,
        deletions: [],
        nextToken: fresh,
        mode: "bootstrap",
        rawCount: raw.length,
        deletedCount: 0,
      };
    }

    for (const change of response.changes ?? []) {
      if (change.type === "Upsert") {
        rawCount += 1;
        records.push(...mapRecord(change.record as HCRecord));
      } else if (change.type === "Delete") {
        deletedCount += 1;
        deletions.push(deletionTombstone(change.recordId).external_id);
      }
    }
    const previousToken: string = token;
    nextToken = response.nextChangesToken ?? null;
    if (!response.hasMore || !nextToken) break;
    // L1 polish — defensive guard against an SDK that returns the same
    // token on hasMore=true. Without this we'd spin until the page cap.
    if (nextToken === previousToken) break;
    token = nextToken;
    pages += 1;
    // Hard cap to keep one sync run bounded — anything beyond 50 pages
    // (~50k changes) the user is better served by a fresh bootstrap on
    // the next run.
    if (pages >= 50) break;
  }

  return {
    records,
    deletions,
    nextToken,
    mode: "delta",
    rawCount,
    deletedCount,
  };
}

export class HealthSyncError extends Error {
  public readonly code: string;
  public override readonly cause?: unknown;

  constructor(code: string, cause?: unknown) {
    super(code);
    this.name = "HealthSyncError";
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Top-level entrypoint. Pulls all requested record types, ships them to
 * the backend in one batch, and updates the foreground-sync timestamp on
 * success.
 */
export async function syncDevice(
  deviceId: string,
  options: SyncOptions = {}
): Promise<SyncRunSummary> {
  const recordTypes = options.recordTypes ?? MVP_RECORD_TYPES;
  const bootstrapDays = options.bootstrapDays ?? DEFAULT_BOOTSTRAP_DAYS;
  const idempotencyKey =
    options.idempotencyKey ?? defaultIdempotencyKey(deviceId);

  // Step 1: hydrate the per-record-type tokens from Core BE.
  const states = await listSyncState(deviceId);

  // Step 2: pull each record type. Sequential rather than parallel so a
  // user-facing progress UI can render which type is currently syncing
  // and so we don't hammer the HC SDK with concurrent calls (the SDK
  // serializes them anyway on the native side).
  const perRecordType: SyncRunSummary["perRecordType"] = [];
  const allRecords: HealthRecordIn[] = [];
  const allDeletions: { external_id: string }[] = [];
  const nextTokens: Record<string, string> = {};

  for (const recordType of recordTypes) {
    try {
      const result = await pullRecordType(
        recordType,
        tokenFor(states, recordType),
        bootstrapDays
      );
      allRecords.push(...result.records);
      for (const id of result.deletions) {
        allDeletions.push({ external_id: id });
      }
      if (result.nextToken) nextTokens[recordType] = result.nextToken;
      perRecordType.push({
        recordType,
        mode: result.mode,
        raw: result.rawCount,
        mapped: result.records.length,
        deleted: result.deletedCount,
        nextToken: result.nextToken,
      });
    } catch (err) {
      // One record type failing should not nuke the rest of the batch.
      // We surface the failure as a "skipped" entry; the backend will
      // also mark the device's last_sync_status="partial" if any rows
      // come back errored.
      perRecordType.push({
        recordType,
        mode: "skipped",
        raw: 0,
        mapped: 0,
        deleted: 0,
        nextToken: null,
      });
      if (err instanceof HealthConnectUnavailableError) throw err;
    }
  }

  // Step 3: ship the batch — but skip the round trip when there's
  // nothing to write AND no tokens to persist (M1 fix). Otherwise we'd
  // burn an HTTP request, an audit log row pair, and a Redis idempotency
  // entry just to record that nothing happened.
  const batch: HealthIngestBatch = {
    provider: "health_connect",
    records: allRecords,
    deletions: allDeletions,
    next_changes_tokens: nextTokens,
  };

  let ingest: HealthIngestResult;
  if (
    allRecords.length === 0 &&
    allDeletions.length === 0 &&
    Object.keys(nextTokens).length === 0
  ) {
    ingest = { inserted: 0, updated: 0, deleted: 0, skipped: 0, errors: [] };
  } else {
    try {
      ingest = await ingestHealthBatch(deviceId, batch, idempotencyKey);
    } catch (err) {
      if (err instanceof ApiError) {
        // Auth / rate-limit / 5xx failures bubble up so the UI can render
        // the right toast. We do NOT mark the foreground stamp so the
        // next foreground will retry.
        throw err;
      }
      throw new HealthSyncError("INGEST_FAILED", err);
    }
  }

  // Step 4: success housekeeping.
  await markForegroundSyncCompleted();

  return { ingest, perRecordType };
}
