/**
 * Type aliases for the Health Connect record kinds the app cares about.
 *
 * Phase 1 (MVP): Steps + HeartRate.
 * Phase 2 adds:  Sleep + Weight.
 * Phase 4 adds:  BloodPressure + Exercise (stretch).
 *
 * These names are the strings the HC SDK itself uses (`recordType`); we keep
 * a typed alias so the rest of the codebase doesn't depend on string literals.
 */
export type HealthConnectRecordType =
  | "Steps"
  | "HeartRate"
  | "SleepSession"
  | "Weight"
  | "BloodPressure"
  | "ExerciseSession";

/** Phase 1 set — the orchestrator only requests these two for now. */
export const PHASE1_RECORD_TYPES: HealthConnectRecordType[] = [
  "Steps",
  "HeartRate",
];

/** Full MVP set used from Phase 2 onward. */
export const MVP_RECORD_TYPES: HealthConnectRecordType[] = [
  "Steps",
  "HeartRate",
  "SleepSession",
  "Weight",
];

/**
 * Stretch (Phase 4) — adds BloodPressure on top of the MVP set. Exercise
 * sessions are intentionally not yet here because the BE has no
 * matching `metric_type` enum entry; adding one is a separate migration.
 */
export const STRETCH_RECORD_TYPES: HealthConnectRecordType[] = [
  "Steps",
  "HeartRate",
  "SleepSession",
  "Weight",
  "BloodPressure",
];

/**
 * Minimal shape of an HC record metadata block. The real type from
 * `react-native-health-connect` carries more fields, but the orchestrator
 * + mapper only need these — by re-declaring the subset we can mock it
 * trivially in tests without depending on the (Android-only) native module.
 */
export interface HCRecordMetadata {
  id: string;
  clientRecordId?: string | null;
  clientRecordVersion?: number | null;
  lastModifiedTime?: string | null;
  recordingMethod?: number | string | null;
  dataOrigin?: string | { packageName?: string };
}

export interface HCQuantity {
  inMilligrams?: number;
  inKilograms?: number;
  inGrams?: number;
}

/**
 * Common subset of fields across HC records. We re-export this rather than
 * importing the native types so unit tests can fabricate fixtures without
 * paying the dependency cost.
 */
export interface HCRecord {
  recordType: HealthConnectRecordType | string;
  metadata: HCRecordMetadata;
  // Steps / Sleep / Exercise — interval records.
  startTime?: string;
  endTime?: string;
  // Steps payload.
  count?: number;
  // Heart rate.
  samples?: { time: string; beatsPerMinute: number }[];
  // Weight.
  weight?: HCQuantity & { value?: number };
  time?: string;
  // Blood pressure.
  systolic?: HCQuantity & { inMillimetersOfMercury?: number; value?: number };
  diastolic?: HCQuantity & { inMillimetersOfMercury?: number; value?: number };
  // Exercise.
  exerciseType?: number | string;
}

/**
 * Result of `getChanges` — mirrors the HC Java/Kotlin response shape as
 * surfaced by `react-native-health-connect`.
 */
export interface HCChangesResponse {
  /**
   * The token to keep for the next sync run. May be null if the response
   * was an empty bootstrap result.
   */
  nextChangesToken?: string | null;
  /** True when the supplied token has expired and must be re-initialized. */
  changesTokenExpired?: boolean;
  /** True when there are more pages to fetch with the new nextChangesToken. */
  hasMore?: boolean;
  /** Inserted / updated record envelopes. */
  changes: Array<
    | { type: "Upsert"; record: HCRecord }
    | { type: "Delete"; recordId: string }
  >;
}
