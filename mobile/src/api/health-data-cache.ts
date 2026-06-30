import { invalidateApiQuery } from './query';
import { queryKeys } from './queryKeys';

const HEALTH_DATA_CACHE_PREFIXES = [
  queryKeys.dashboard,
  queryKeys.riskSummary,
  queryKeys.healthGoal,
  'reports.',
  'goals.progress.',
  'vitals.timeseries.',
];

export function invalidateHealthDataCaches(deviceId?: string | null) {
  const id = deviceId?.trim();

  invalidateApiQuery(queryKeys.devices);
  if (id) {
    invalidateApiQuery(queryKeys.device(id));
    invalidateApiQuery(queryKeys.deviceSyncState(id));
  }

  for (const prefix of HEALTH_DATA_CACHE_PREFIXES) {
    invalidateApiQuery(prefix);
  }
}
