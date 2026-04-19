/**
 * Typed wrappers around HC's `getChangesToken`, `getChanges`, and
 * `readRecords` — one per record type the orchestrator cares about.
 *
 * Why a small wrapper instead of inlining: the underlying SDK returns
 * loosely-typed `unknown[]`s that we need to reshape before dedupe. Keeping
 * the marshalling here means the orchestrator stays a flat orchestration
 * loop and the mapper can be unit tested in isolation.
 */
import { ensureInitialized } from "./client";
import type {
  HCChangesResponse,
  HCRecord,
  HealthConnectRecordType,
} from "./types";

export interface ReadWindow {
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
}

/**
 * Initialize a brand-new changes token for the given record types. Called
 * on first connect and on the bootstrap fallback path (after a token
 * expires). The returned token MUST be persisted server-side before any
 * subsequent `getChanges` call.
 */
export async function initChangesToken(
  recordTypes: HealthConnectRecordType[]
): Promise<string> {
  const mod = await ensureInitialized();
  return mod.getChangesToken({ recordTypes });
}

/**
 * Apply an existing token to fetch the delta. The result includes both
 * upserts and deletes; the orchestrator splits them and ships each
 * appropriately.
 */
export async function getChanges(token: string): Promise<HCChangesResponse> {
  const mod = await ensureInitialized();
  const raw = await mod.getChanges(token);
  return raw as HCChangesResponse;
}

/**
 * Bootstrap fallback — read every record in the window for one record type.
 * Used when `getChanges` reports `changesTokenExpired` and we need to
 * rebuild local state. Caller deduplicates via `external_id` upsert on
 * the backend so this is safe to repeat.
 */
export async function readRecordsWindow(
  recordType: HealthConnectRecordType,
  window: ReadWindow,
  pageSize = 1000
): Promise<HCRecord[]> {
  const mod = await ensureInitialized();
  const out: HCRecord[] = [];
  let pageToken: string | undefined;
  // Cap the inner loop at 50 pages (=50k records) to avoid infinite
  // bootstrap if a misbehaving source app keeps returning a non-null
  // pageToken. The next sync run can pick up where we left off via the
  // freshly-issued changesToken.
  for (let i = 0; i < 50; i++) {
    const result = await mod.readRecords(recordType, {
      timeRangeFilter: {
        operator: "between",
        startTime: window.startTime,
        endTime: window.endTime,
      },
      pageSize,
      pageToken,
      ascendingOrder: true,
    });
    out.push(...((result.records ?? []) as HCRecord[]));
    pageToken = result.pageToken;
    if (!pageToken) break;
  }
  return out;
}
