import { useCallback, useState } from 'react';
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

  const sync = useCallback(async (options: SyncHealthConnectOptions = {}) => {
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
      setIsSyncing(false);
    }
  }, [adapter]);

  const reset = useCallback(async (
    options: ResetHealthConnectSyncStateOptions = {},
  ): Promise<ResetHealthConnectSyncStateResult> => {
    setIsSyncing(true);
    setError(null);
    try {
      return await resetHealthConnectSyncState(options);
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error('Health Connect sync-state reset failed.');
      setError(normalized);
      throw normalized;
    } finally {
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
