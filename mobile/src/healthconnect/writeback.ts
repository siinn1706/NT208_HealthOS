/**
 * Phase 4 stretch — push manual HealthOS entries back into Health Connect.
 *
 * The flow:
 *   1. User adds a manual reading via the existing `createHealthMetric`
 *      flow (e.g. logs a weight from the metrics screen).
 *   2. The mobile app calls `pushManualEntryToHealthConnect()` with the
 *      newly-created HealthMetric.
 *   3. We map it to an HC record (with our `clientRecordId` so dedupe
 *      works across re-syncs) and call `insertRecords`.
 *   4. On the next sync, our orchestrator will see the record come back
 *      via `getChanges` — but the `external_version` "newer wins" guard
 *      will keep our row authoritative because we wrote it with version
 *      = epoch_ms (incoming HC echo will be the same or older).
 *
 * Failure handling: write-back is "fire and forget" — if HC isn't
 * installed or the user revoked the WRITE permission, we log and move
 * on. The HealthOS row is the canonical record either way.
 */
import type { HealthMetric } from "@/api/endpoints/health-metrics";

import { ensureInitialized, HealthConnectUnavailableError } from "./client";
import type { HealthConnectRecordType } from "./types";

interface HCInsertModule {
  insertRecords: (records: HCWriteableRecord[]) => Promise<string[]>;
}

interface HCWriteableRecord {
  recordType: HealthConnectRecordType;
  clientRecordId: string;
  clientRecordVersion: number;
  startTime?: string;
  endTime?: string;
  time?: string;
  count?: number;
  samples?: { time: string; beatsPerMinute: number }[];
  weight?: { inKilograms: number };
  systolic?: { inMillimetersOfMercury: number };
  diastolic?: { inMillimetersOfMercury: number };
}

/**
 * Map one HealthOS manual entry to the HC record envelope. Returns null
 * for metric types we don't support write-back for yet (sleep is read-only
 * because the data model would need duration + start/end which our
 * current "value=minutes" shape doesn't carry).
 */
export function manualEntryToHcRecord(
  metric: HealthMetric,
  clientRecordId: string
): HCWriteableRecord | null {
  // Use HealthOS's `recorded_at` as both the version and the timestamp.
  const version = Date.parse(metric.recorded_at);
  if (!Number.isFinite(version)) return null;
  const base = { clientRecordId, clientRecordVersion: version };

  switch (metric.metric_type) {
    case "steps":
      // Steps are interval-based in HC. We use a 1-minute window ending at
      // recorded_at — the user's manual entry is conceptually a "summary"
      // not a streamed sample, but HC enforces interval shape anyway.
      return {
        ...base,
        recordType: "Steps",
        endTime: metric.recorded_at,
        startTime: new Date(version - 60_000).toISOString(),
        count: Math.round(metric.value),
      };
    case "heart_rate":
      return {
        ...base,
        recordType: "HeartRate",
        startTime: metric.recorded_at,
        endTime: metric.recorded_at,
        samples: [
          { time: metric.recorded_at, beatsPerMinute: Math.round(metric.value) },
        ],
      };
    case "weight_kg":
      return {
        ...base,
        recordType: "Weight",
        time: metric.recorded_at,
        weight: { inKilograms: metric.value },
      };
    case "blood_pressure_systolic":
      // For BP we'd need both halves to write a single HC record. The
      // caller is expected to pair sys+dia and call writeBloodPressure
      // (below) instead; this single-row case can't write meaningfully.
      return null;
    case "blood_pressure_diastolic":
      return null;
    case "sleep_minutes":
      // Sleep needs (start, end) — HealthOS only has a duration. Skip.
      return null;
    default:
      return null;
  }
}

export async function pushManualEntryToHealthConnect(
  metric: HealthMetric,
  /** A stable id we own — typically the HealthOS metric.id (a UUID). */
  clientRecordId: string
): Promise<string | null> {
  const record = manualEntryToHcRecord(metric, clientRecordId);
  if (!record) return null;

  let mod: HCInsertModule;
  try {
    mod = (await ensureInitialized()) as unknown as HCInsertModule;
  } catch (err) {
    if (err instanceof HealthConnectUnavailableError) {
      // HC isn't installed — write-back is a "best effort" so we just
      // skip. The row is already in HealthOS via the regular create flow.
      return null;
    }
    throw err;
  }

  const ids = await mod.insertRecords([record]);
  return ids[0] ?? null;
}

/**
 * BP write-back — needs both halves in one HC record. Caller passes the
 * pair of HealthOS metric ids that compose one reading.
 */
export async function pushBloodPressureToHealthConnect(
  systolic: HealthMetric,
  diastolic: HealthMetric,
  clientRecordId: string
): Promise<string | null> {
  if (
    systolic.metric_type !== "blood_pressure_systolic" ||
    diastolic.metric_type !== "blood_pressure_diastolic"
  ) {
    return null;
  }
  const version = Date.parse(systolic.recorded_at);
  if (!Number.isFinite(version)) return null;

  let mod: HCInsertModule;
  try {
    mod = (await ensureInitialized()) as unknown as HCInsertModule;
  } catch (err) {
    if (err instanceof HealthConnectUnavailableError) return null;
    throw err;
  }

  const record: HCWriteableRecord = {
    recordType: "BloodPressure",
    clientRecordId,
    clientRecordVersion: version,
    time: systolic.recorded_at,
    systolic: { inMillimetersOfMercury: Math.round(systolic.value) },
    diastolic: { inMillimetersOfMercury: Math.round(diastolic.value) },
  };
  const ids = await mod.insertRecords([record]);
  return ids[0] ?? null;
}
