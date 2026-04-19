/**
 * Hook that wires Health Connect auto-sync to the app's foreground events.
 *
 * Behaviour (matches plan §4.5):
 *   - On every `AppState` transition to "active", check the persistent
 *     debounce stamp (`storage.getLastForegroundSyncMs`). If the last sync
 *     completed more than `FOREGROUND_SYNC_DEBOUNCE_MS` ago, trigger the
 *     orchestrator for every Health Connect device the current user has.
 *   - Skip silently if the user isn't authenticated or there are no HC
 *     devices on file (e.g. user uninstalled / disconnected).
 *   - Skip silently if HC isn't installed at all (`HealthConnectUnavailableError`).
 *   - Failures are logged in dev only; we don't toast on auto-sync errors
 *     because a foreground transition isn't a user action.
 *
 * Mounted exactly once at the root layout. The shape mirrors the existing
 * `useNetworkStatus` / `OfflineBanner` pattern of "side effect that lives
 * outside the React tree but reacts to lifecycle events".
 */
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { sessionStore } from "@/auth/session";
import { listDevices, patchDevicePermissions } from "@/api/endpoints/devices";
import { syncDevice } from "./orchestrator";
import { shouldRunForegroundSync } from "./storage";
import { HealthConnectUnavailableError } from "./client";
import { getGrantedPermissions } from "./permissions";
import { MVP_RECORD_TYPES, type HealthConnectRecordType } from "./types";

export function useHealthConnectForegroundSync(): void {
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function maybeSync(): Promise<void> {
      if (inFlight) return;
      const session = sessionStore.getState();
      if (!session.token) return;
      if (!(await shouldRunForegroundSync())) return;

      inFlight = true;
      try {
        const devices = await listDevices().catch(() => []);
        if (cancelled) return;
        const hcDevices = devices.filter((d) => d.provider === "health_connect");
        for (const dev of hcDevices) {
          if (cancelled) return;

          // ── Step 1: reconcile permissions BEFORE attempting sync ───
          // Detects the case where the user revoked one or more record
          // types in Android Settings → Health Connect → Apps → HealthOS.
          // If permissions are gone we PATCH the backend so the UI's
          // "permission_denied" banner fires instead of the generic
          // "Last sync failed" we'd get from a getChanges exception.
          let grantedTypes: HealthConnectRecordType[] | null = null;
          try {
            const grant = await getGrantedPermissions(MVP_RECORD_TYPES);
            grantedTypes = grant.granted.map(
              (g) => g.recordType as HealthConnectRecordType
            );
            const priorScopes = new Set(dev.scopes ?? []);
            const grantedSet = new Set<string>(grantedTypes);
            const sameSet =
              grantedSet.size === priorScopes.size &&
              [...grantedSet].every((s) => priorScopes.has(s));
            if (!sameSet) {
              try {
                await patchDevicePermissions(dev.id, grantedTypes);
              } catch (patchErr) {
                if (__DEV__) {
                  console.warn(
                    "[hc] failed to PATCH device permissions",
                    dev.id,
                    patchErr
                  );
                }
              }
            }
          } catch (permErr) {
            if (permErr instanceof HealthConnectUnavailableError) {
              if (__DEV__) {
                console.info(
                  "[hc] auto-sync skipped — HC unavailable",
                  permErr.availability
                );
              }
              break; // No point checking other devices.
            }
            // Other failures (rare) — log and proceed to sync; the sync
            // itself will likely also fail but we let it surface its own
            // error path.
            if (__DEV__) {
              console.warn("[hc] permission check failed", dev.id, permErr);
            }
          }

          // ── Step 2: skip sync entirely when nothing is granted ─────
          // No data flow possible, no point burning a request + audit
          // log + rate-limit budget. The PATCH above (if it ran) already
          // flipped status to `permission_denied`.
          if (grantedTypes !== null && grantedTypes.length === 0) {
            continue;
          }

          // ── Step 3: actually sync ──────────────────────────────────
          try {
            await syncDevice(
              dev.id,
              grantedTypes && grantedTypes.length > 0
                ? { recordTypes: grantedTypes }
                : undefined
            );
          } catch (err) {
            if (__DEV__) {
              if (err instanceof HealthConnectUnavailableError) {
                console.info(
                  "[hc] auto-sync skipped — HC unavailable",
                  err.availability
                );
              } else {
                console.warn("[hc] auto-sync failed for", dev.id, err);
              }
            }
            if (err instanceof HealthConnectUnavailableError) break;
          }
        }
        if (hcDevices.length > 0) {
          qc.invalidateQueries({ queryKey: ["devices"] });
        }
      } finally {
        inFlight = false;
      }
    }

    function onChange(state: AppStateStatus) {
      if (state === "active") {
        void maybeSync();
      }
    }

    void maybeSync();
    const sub = AppState.addEventListener("change", onChange);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [qc]);
}
