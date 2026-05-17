import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_CACHE = 100;
const TTL_MS = 5 * 60 * 1000;

interface CacheEntry { data: unknown; ts: number; }
const memoryCache = new Map<string, CacheEntry>();

function cacheGet(key: string): unknown | undefined {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > TTL_MS) { memoryCache.delete(key); return undefined; }
  return entry.data;
}

function cacheSet(key: string, data: unknown) {
  if (memoryCache.size >= MAX_CACHE) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { data, ts: Date.now() });
}

export interface ApiQueryResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRefreshing: boolean;
  /** True when data resolved to an empty array */
  isEmpty: boolean;
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
  const cached = cacheGet(key) as T | undefined;
  const initial = cached !== undefined ? cached : (options.initialData ?? null);
  const [data, setData] = useState<T | null>(initial);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(enabled && cached === undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const activeRef = useRef(true);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const hasCached = cacheGet(key) !== undefined;
    if (hasCached) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const next = await queryFn();
      if (!activeRef.current) return;
      cacheSet(key, next);
      setData(next);
      setError(null);
    } catch (err) {
      if (!activeRef.current) return;
      setError(err instanceof Error ? err : new Error('Request failed.'));
    } finally {
      if (activeRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [enabled, key, queryFn]);

  useEffect(() => {
    activeRef.current = true;
    if (!enabled) {
      setIsLoading(false);
      return () => { activeRef.current = false; };
    }
    const hit = cacheGet(key);
    if (hit !== undefined) {
      setData(hit as T);
      setIsLoading(false);
    }
    reload();
    return () => {
      activeRef.current = false;
    };
  }, [enabled, key, reload]);

  const isEmpty = !isLoading && !error && Array.isArray(data) && data.length === 0;
  return { data, error, isLoading, isRefreshing, isEmpty, reload };
}
