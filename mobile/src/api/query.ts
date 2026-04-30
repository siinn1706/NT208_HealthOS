import { useCallback, useEffect, useState } from 'react';

const memoryCache = new Map<string, unknown>();

export interface ApiQueryResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRefreshing: boolean;
  reload: () => Promise<void>;
}

interface ApiQueryOptions<T> {
  enabled?: boolean;
  initialData?: T | null;
}

export function invalidateApiQuery(prefix?: string) {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  Array.from(memoryCache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  });
}

export function useApiQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: ApiQueryOptions<T> = {},
): ApiQueryResult<T> {
  const enabled = options.enabled ?? true;
  const cached = memoryCache.has(key) ? (memoryCache.get(key) as T) : options.initialData ?? null;
  const [data, setData] = useState<T | null>(cached);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(enabled && !cached);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    if (memoryCache.has(key)) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const next = await queryFn();
      memoryCache.set(key, next);
      setData(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Request failed.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [enabled, key, queryFn]);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setIsLoading(false);
      return undefined;
    }
    if (memoryCache.has(key)) {
      setData(memoryCache.get(key) as T);
      setIsLoading(false);
    }
    reload().finally(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [enabled, key, reload]);

  return { data, error, isLoading, isRefreshing, reload };
}
