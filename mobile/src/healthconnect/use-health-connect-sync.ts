import { useCallback, useRef, useState } from 'react';
import {
  resetHealthConnectSyncState,
  syncHealthConnect,
  type HealthConnectSyncAdapter,
  type ResetHealthConnectSyncStateOptions,
  type ResetHealthConnectSyncStateResult,
  type SyncHealthConnectOptions,
  type SyncHealthConnectResult,
} from './orchestrator';

export function useHealthConnectSync(adapter: HealthConnectSyncAdapter) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<SyncHealthConnectResult | null>(null);
  // Synchronous in-flight guard: state updates are async, so a ref is the only
  // reliable way to reject a second call before the first finishes. sync and
  // reset share it because both mutate the device's sync-state tokens — running
  // them concurrently could interleave token reads/writes.
  const busyRef = useRef(false);

  const sync = useCallback(async (options: SyncHealthConnectOptions = {}) => {
    if (busyRef.current) {
      throw new Error('A Health Connect operation is already in progress.');
    }
    busyRef.current = true;
    setIsSyncing(true);
    setError(null);
    try {
      const result = await syncHealthConnect(adapter, options);
      setLastResult(result);
      return result;
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error('Health Connect sync failed.');
      setError(normalized);
      throw normalized;
    } finally {
      busyRef.current = false;
      setIsSyncing(false);
    }
  }, [adapter]);

  const reset = useCallback(async (
    options: ResetHealthConnectSyncStateOptions = {},
  ): Promise<ResetHealthConnectSyncStateResult> => {
    if (busyRef.current) {
      throw new Error('A Health Connect operation is already in progress.');
    }
    busyRef.current = true;
    setIsSyncing(true);
    setError(null);
    try {
      return await resetHealthConnectSyncState(options);
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error('Health Connect sync-state reset failed.');
      setError(normalized);
      throw normalized;
    } finally {
      busyRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  return {
    sync,
    reset,
    isSyncing,
    error,
    lastResult,
  };
}
