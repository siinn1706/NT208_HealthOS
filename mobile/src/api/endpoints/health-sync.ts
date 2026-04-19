/**
 * Typed clients for the Health Connect sync endpoints on Core BE.
 *
 * Contract:
 *   - POST /v1/devices/{id}/ingest   — batch upsert. Idempotency-Key REQUIRED.
 *   - GET  /v1/devices/{id}/sync-state — list per-record-type tokens.
 *   - PUT  /v1/devices/{id}/sync-state — replace tokens (no records).
 */
import { apiFetch } from "../client";

export type HealthMetricType =
  | "heart_rate"
  | "steps"
  | "sleep_minutes"
  | "weight_kg"
  | "blood_pressure_systolic"
  | "blood_pressure_diastolic";

/**
 * One record sent to the backend. `external_id` MUST be unique within
 * (user, source) — the backend uses it as the dedupe key. For Health
 * Connect this is the HC `metadata.id` (or `clientRecordId` for records
 * we wrote ourselves).
 */
export interface HealthRecordIn {
  external_id: string;
  external_version?: number | null;
  metric_type: HealthMetricType;
  value: number;
  unit: string;
  recorded_at: string; // ISO 8601
  source?: string; // defaults to "health_connect"
  source_app?: string | null;
  recording_method?: string | null;
  is_deleted?: boolean;
}

/** Tombstone — backend only needs the external_id to soft-delete. */
export interface HealthDeletionIn {
  external_id: string;
}

export interface HealthIngestBatch {
  provider?: string;
  records: HealthRecordIn[];
  /**
   * Dedicated deletion list (preferred over `is_deleted=true` records).
   * The backend folds both shapes together at upsert time.
   */
  deletions?: HealthDeletionIn[];
  /**
   * Map of HC record-type name -> next changesToken to persist atomically
   * with the records. Keys are HC names ("Steps", "HeartRate", ...).
   */
  next_changes_tokens?: Record<string, string>;
}

export interface HealthIngestResult {
  inserted: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: { external_id: string; reason: string }[];
}

export interface SyncStateEntry {
  record_type: string;
  changes_token: string | null;
  last_synced_at: string | null;
  last_attempted_at: string | null;
  consecutive_failures: number;
}

/**
 * Post a batch of HC records + the new changesTokens to the backend.
 * The caller MUST supply a stable `idempotencyKey` so retries collapse.
 */
export async function ingestHealthBatch(
  deviceId: string,
  batch: HealthIngestBatch,
  idempotencyKey: string
): Promise<HealthIngestResult> {
  const res = await apiFetch<{ data: HealthIngestResult }>(
    `/v1/devices/${deviceId}/ingest`,
    {
      method: "POST",
      body: batch,
      // Forward the orchestrator's idempotency key as a header so the
      // backend's Idempotency-Key middleware can collapse retries of the
      // same logical sync run. The `apiFetch` client does not (yet)
      // expose `idempotencyKey` as a first-class option in this branch
      // of the codebase, so we pass it via headers directly.
      headers: { "Idempotency-Key": idempotencyKey },
      // Don't auto-retry — Idempotency-Key already gives us safe replay
      // semantics, and we want the orchestrator to see real failures so
      // it can update local state.
      retry: false,
    }
  );
  return res.data;
}

export async function listSyncState(
  deviceId: string
): Promise<SyncStateEntry[]> {
  const res = await apiFetch<{ data: SyncStateEntry[] }>(
    `/v1/devices/${deviceId}/sync-state`
  );
  return res.data;
}

export async function replaceSyncState(
  deviceId: string,
  tokens: Record<string, string | null>
): Promise<SyncStateEntry[]> {
  const res = await apiFetch<{ data: SyncStateEntry[] }>(
    `/v1/devices/${deviceId}/sync-state`,
    { method: "PUT", body: { tokens } }
  );
  return res.data;
}
