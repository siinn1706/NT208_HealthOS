/**
 * Shared data-state model used across all dashboard surfaces.
 *
 * Every BFF route handler should normalise its upstream response into this
 * shape so that the FE can map 1:1 onto the <DataState/> primitive without
 * each surface inventing its own loading/empty/error vocabulary.
 *
 * Conventions:
 * - `status` is exhaustive — every surface must handle every status.
 * - `data` carries the payload when the slice resolves successfully (or
 *   partially, in which case `status === "partial"` or `"degraded"`).
 * - `meta` carries trust cues (source, freshness, AI confidence) used by
 *   <SourceBadge>, <FreshnessChip>, <ConfidenceChip>.
 * - `error.code` is a stable, machine-readable identifier; `error.message`
 *   is a human-readable fallback (already localised by the BFF when possible).
 */

export type DataSliceStatus =
  | "loading"
  | "syncing"
  | "stale"
  | "partial"
  | "no_permission"
  | "empty"
  | "empty_in_range"
  | "pending"
  | "degraded"
  | "success"
  | "recoverable_error"
  | "hard_error";

export type ProviderId =
  | "manual"
  | "apple_health"
  | "google_fit"
  | "fitbit"
  | "garmin"
  | "withings"
  | "samsung_health"
  // Android Health Connect aggregator. Distinct from the per-app providers
  // because HC itself rebroadcasts data from many sources; the row's
  // `source_app` carries the originating package.
  | "health_connect";

export interface DataSliceError {
  code: string;
  message: string;
  /** Optional structured context for debugging / analytics. */
  details?: Record<string, unknown>;
}

export interface DataSliceMeta {
  /** ISO timestamp the underlying data was generated server-side. */
  generated_at?: string;
  /** ISO timestamp the underlying data was recorded by the source device/user. */
  recorded_at?: string;
  /** ISO timestamp the data was ingested into our system. */
  ingested_at?: string;
  /** Source provider that produced the value. */
  source?: ProviderId;
  /** AI / model confidence for derived values, 0..1 inclusive. */
  confidence?: number;
  /** Pagination — see docs/standards/api-conventions.md. */
  page?: number;
  per_page?: number;
  total?: number;
  /** Used by partial / degraded statuses to enumerate which sub-slices failed. */
  missing?: string[];
}

export interface DataSlice<T> {
  status: DataSliceStatus;
  data?: T;
  error?: DataSliceError;
  meta?: DataSliceMeta;
}

/**
 * Convenience constructors so call-sites stay short.
 */
export const dataSlice = {
  loading: <T>(): DataSlice<T> => ({ status: "loading" }),
  empty: <T>(meta?: DataSliceMeta): DataSlice<T> => ({ status: "empty", meta }),
  emptyInRange: <T>(meta?: DataSliceMeta): DataSlice<T> => ({ status: "empty_in_range", meta }),
  success: <T>(data: T, meta?: DataSliceMeta): DataSlice<T> => ({ status: "success", data, meta }),
  partial: <T>(data: T, meta?: DataSliceMeta): DataSlice<T> => ({ status: "partial", data, meta }),
  degraded: <T>(data: T, meta?: DataSliceMeta): DataSlice<T> => ({ status: "degraded", data, meta }),
  stale: <T>(data: T, meta?: DataSliceMeta): DataSlice<T> => ({ status: "stale", data, meta }),
  noPermission: <T>(error?: DataSliceError): DataSlice<T> => ({
    status: "no_permission",
    error: error ?? { code: "NO_PERMISSION", message: "Permission required." },
  }),
  pending: <T>(meta?: DataSliceMeta): DataSlice<T> => ({ status: "pending", meta }),
  recoverableError: <T>(error: DataSliceError): DataSlice<T> => ({
    status: "recoverable_error",
    error,
  }),
  hardError: <T>(error: DataSliceError): DataSlice<T> => ({
    status: "hard_error",
    error,
  }),
} as const;

/**
 * Time tier used by <FreshnessChip>. Computed from `recorded_at` or
 * `ingested_at` on the data slice meta.
 */
export type FreshnessTier = "live" | "recent" | "stale" | "very_stale" | "no_data";

export function freshnessTierFor(iso?: string | null, now: number = Date.now()): FreshnessTier {
  if (!iso) return "no_data";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "no_data";
  const diffMs = now - t;
  const min = diffMs / 60_000;
  if (min < 15) return "live";
  if (min < 6 * 60) return "recent";
  if (min < 48 * 60) return "stale";
  return "very_stale";
}

export type ConfidenceTier = "high" | "medium" | "low" | "unknown";

export function confidenceTierFor(value?: number | null): ConfidenceTier {
  if (typeof value !== "number" || Number.isNaN(value)) return "unknown";
  if (value >= 0.8) return "high";
  if (value >= 0.6) return "medium";
  return "low";
}
