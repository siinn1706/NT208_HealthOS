/**
 * Pure functions that turn Health Connect record envelopes into the
 * `HealthRecordIn` shape Core BE expects.
 *
 * Why a separate module: the mapping is the most-likely-to-change part of
 * the integration (HC adds new record types, units evolve), and it is
 * fully unit-testable without any native dependency. The orchestrator
 * just calls into here and hands the result to `ingestHealthBatch`.
 *
 * Mapping table (matches plan §4.3):
 *   StepsRecord         -> steps         (one row per HC record)
 *   HeartRateRecord     -> heart_rate    (avg of samples; recorded_at = midpoint)
 *   SleepSessionRecord  -> sleep_minutes (endTime - startTime / 60)
 *   WeightRecord        -> weight_kg     (as-is)
 *   BloodPressureRecord -> blood_pressure_systolic + _diastolic
 *                          (two rows sharing external_id with suffix)
 */
import type { HealthRecordIn } from "@/api/endpoints/health-sync";
import type { HCRecord } from "./types";

/**
 * HC `Metadata.recordingMethod` is an int in the SDK:
 *   0 = unknown, 1 = active, 2 = automatic, 3 = manual
 * Our backend stores a short string for UI rendering ("Synced from
 * Samsung Health (automatic)").
 */
const RECORDING_METHOD: Record<number, string> = {
  0: "unknown",
  1: "active",
  2: "automatic",
  3: "manual",
};

function recordingMethodFromHC(value: unknown): string | undefined {
  if (typeof value === "number") return RECORDING_METHOD[value] ?? "unknown";
  if (typeof value === "string") return value.toLowerCase();
  return undefined;
}

function dataOriginFromHC(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "packageName" in value) {
    const packageName = (value as { packageName?: string }).packageName;
    return typeof packageName === "string" ? packageName : undefined;
  }
  return undefined;
}

function externalIdFor(record: HCRecord): string | null {
  // Prefer `metadata.id` (HC-owned identity) over `clientRecordId` (we
  // only set the latter when WE write — Phase 4 stretch). Both are
  // stable across syncs.
  return record.metadata?.id || record.metadata?.clientRecordId || null;
}

function externalVersionFor(record: HCRecord): number | null {
  if (typeof record.metadata?.clientRecordVersion === "number") {
    return record.metadata.clientRecordVersion;
  }
  if (typeof record.metadata?.lastModifiedTime === "string") {
    // Use epoch ms as a monotonically-increasing version. Even if HC
    // doesn't supply clientRecordVersion (third-party apps often skip
    // it), `lastModifiedTime` is set on every write/update so it serves
    // the "newer wins" guard correctly.
    const ts = Date.parse(record.metadata.lastModifiedTime);
    return Number.isFinite(ts) ? ts : null;
  }
  return null;
}

interface MapBase {
  external_id: string;
  external_version: number | null;
  recorded_at: string;
  source: string;
  source_app?: string;
  recording_method?: string;
}

function baseFor(record: HCRecord, recordedAt: string): MapBase | null {
  const external_id = externalIdFor(record);
  if (!external_id) return null;
  const base: MapBase = {
    external_id,
    external_version: externalVersionFor(record),
    recorded_at: recordedAt,
    source: "health_connect",
  };
  const sourceApp = dataOriginFromHC(record.metadata?.dataOrigin);
  if (sourceApp) base.source_app = sourceApp;
  const recording = recordingMethodFromHC(record.metadata?.recordingMethod);
  if (recording) base.recording_method = recording;
  return base;
}

// ── Per-record-type mappers ────────────────────────────────────────────

function mapSteps(record: HCRecord): HealthRecordIn | null {
  if (typeof record.count !== "number") return null;
  if (!record.endTime) return null;
  const base = baseFor(record, record.endTime);
  if (!base) return null;
  return {
    ...base,
    metric_type: "steps",
    value: record.count,
    unit: "steps",
  };
}

function mapHeartRate(record: HCRecord): HealthRecordIn | null {
  const samples = record.samples ?? [];
  if (samples.length === 0) return null;
  // Average of all samples in the record. HC stores HR records as a
  // group of (time, bpm) samples with a startTime/endTime; we collapse
  // to one HealthOS row per HC record so the chart density matches the
  // dashboard's existing assumption (one HR datapoint per minute-ish).
  let total = 0;
  let count = 0;
  for (const sample of samples) {
    if (typeof sample.beatsPerMinute === "number" && Number.isFinite(sample.beatsPerMinute)) {
      total += sample.beatsPerMinute;
      count += 1;
    }
  }
  if (count === 0) return null;
  const avg = total / count;
  // Use the midpoint sample's timestamp so charts plot the heartbeat
  // close to when it was actually measured.
  const midpoint = samples[Math.floor(samples.length / 2)]?.time;
  if (!midpoint) return null;
  const base = baseFor(record, midpoint);
  if (!base) return null;
  return {
    ...base,
    metric_type: "heart_rate",
    value: Math.round(avg * 10) / 10,
    unit: "bpm",
  };
}

function mapSleepSession(record: HCRecord): HealthRecordIn | null {
  if (!record.startTime || !record.endTime) return null;
  const start = Date.parse(record.startTime);
  const end = Date.parse(record.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const minutes = Math.round((end - start) / 60000);
  const base = baseFor(record, record.endTime);
  if (!base) return null;
  return {
    ...base,
    metric_type: "sleep_minutes",
    value: minutes,
    unit: "min",
  };
}

function mapWeight(record: HCRecord): HealthRecordIn | null {
  // HC's WeightRecord may expose value in `inKilograms` (newer SDK) or via
  // the older `value` field on the wrapping `Mass` object. Accept either.
  const weight = record.weight;
  const kg =
    typeof weight?.inKilograms === "number"
      ? weight.inKilograms
      : typeof weight?.value === "number"
        ? weight.value
        : null;
  if (kg === null || !Number.isFinite(kg) || kg <= 0) return null;
  const recordedAt = record.time ?? record.endTime ?? record.startTime;
  if (!recordedAt) return null;
  const base = baseFor(record, recordedAt);
  if (!base) return null;
  return {
    ...base,
    metric_type: "weight_kg",
    value: Math.round(kg * 100) / 100,
    unit: "kg",
  };
}

function mapBloodPressure(record: HCRecord): HealthRecordIn[] | null {
  // Stretch type — kept here so Phase 4 only needs to flip the dispatch
  // table below, not re-do the mapping shape.
  const sys =
    record.systolic?.inMillimetersOfMercury ??
    record.systolic?.value ??
    null;
  const dia =
    record.diastolic?.inMillimetersOfMercury ??
    record.diastolic?.value ??
    null;
  if (sys === null || dia === null) return null;
  const recordedAt = record.time ?? record.endTime ?? record.startTime;
  if (!recordedAt) return null;
  const base = baseFor(record, recordedAt);
  if (!base) return null;
  // Same external_id with a suffix so the two HealthOS rows are
  // independently dedup-able but trace back to one HC record.
  return [
    {
      ...base,
      external_id: `${base.external_id}#sys`,
      metric_type: "blood_pressure_systolic",
      value: Math.round(sys),
      unit: "mmHg",
    },
    {
      ...base,
      external_id: `${base.external_id}#dia`,
      metric_type: "blood_pressure_diastolic",
      value: Math.round(dia),
      unit: "mmHg",
    },
  ];
}

/**
 * Dispatch table — switch is much harder to read than this and risks
 * forgetting a record type when adding new ones in Phase 4.
 */
export function mapRecord(record: HCRecord): HealthRecordIn[] {
  switch (record.recordType) {
    case "Steps": {
      const r = mapSteps(record);
      return r ? [r] : [];
    }
    case "HeartRate": {
      const r = mapHeartRate(record);
      return r ? [r] : [];
    }
    case "SleepSession": {
      const r = mapSleepSession(record);
      return r ? [r] : [];
    }
    case "Weight": {
      const r = mapWeight(record);
      return r ? [r] : [];
    }
    case "BloodPressure": {
      return mapBloodPressure(record) ?? [];
    }
    default:
      return [];
  }
}

/**
 * Convenience: build a deletion tombstone from an HC `recordId`.
 * Uses the dedicated `HealthDeletionIn` shape — the backend only needs
 * the external_id to flip is_deleted=true (M7 fix). The legacy
 * "fake metric_type + value=0 + is_deleted=true" envelope still works
 * server-side for older mobile builds.
 */
export function deletionTombstone(recordId: string): { external_id: string } {
  return { external_id: recordId };
}
