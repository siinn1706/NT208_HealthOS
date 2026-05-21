import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_CACHE = 100;
const TTL_MS = 5 * 60 * 1000;
const TTL_SWEEP_INTERVAL = 20;
const ANON_SCOPE = 'anon';
const SESSION_SCOPE_SEPARATOR = '::';

interface CacheEntry { data: unknown; ts: number; }
const memoryCache = new Map<string, CacheEntry>();
let cacheSetCount = 0;
let activeSessionScope = ANON_SCOPE;

/** In-flight dedup: concurrent callers with the same key share one request. */
const inflight = new Map<string, Promise<unknown>>();

function normalizeScope(scope: string | null | undefined): string {
  const next = scope?.trim();
  return next ? next : ANON_SCOPE;
}

function toScopedKey(key: string, scope = activeSessionScope): string {
  return `${scope}${SESSION_SCOPE_SEPARATOR}${key}`;
}

function fromScopedKey(scopedKey: string): string {
  const idx = scopedKey.indexOf(SESSION_SCOPE_SEPARATOR);
  return idx >= 0 ? scopedKey.slice(idx + SESSION_SCOPE_SEPARATOR.length) : scopedKey;
}

function cacheGet(key: string): unknown | undefined {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > TTL_MS) { memoryCache.delete(key); return undefined; }
  // Access-order LRU: re-insert to bump recency
  memoryCache.delete(key);
  memoryCache.set(key, entry);
  return entry.data;
}

function cacheSet(key: string, data: unknown) {
  if (memoryCache.size >= MAX_CACHE) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { data, ts: Date.now() });

  // Lazy TTL sweep every N sets to evict expired entries
  if (++cacheSetCount % TTL_SWEEP_INTERVAL === 0) {
    const now = Date.now();
    for (const [k, entry] of memoryCache) {
      if (now - entry.ts > TTL_MS) memoryCache.delete(k);
    }
  }
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

export function setApiSessionScope(scope: string | null | undefined) {
  activeSessionScope = normalizeScope(scope);
}

export function invalidateApiQuery(prefix?: string) {
  if (!prefix) {
    memoryCache.clear();
    inflight.clear();
    return;
  }
  const normalizedPrefix = prefix.trim();
  if (!normalizedPrefix) {
    memoryCache.clear();
    inflight.clear();
    return;
  }
  Array.from(memoryCache.keys()).forEach((key) => {
    const unscoped = fromScopedKey(key);
    if (key.startsWith(normalizedPrefix) || unscoped.startsWith(normalizedPrefix)) {
      memoryCache.delete(key);
    }
  });
  Array.from(inflight.keys()).forEach((key) => {
    const unscoped = fromScopedKey(key);
    if (key.startsWith(normalizedPrefix) || unscoped.startsWith(normalizedPrefix)) {
      inflight.delete(key);
    }
  });
}

export function useApiQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: ApiQueryOptions<T> = {},
): ApiQueryResult<T> {
  const sessionScope = activeSessionScope;
  const scopedKey = toScopedKey(key, sessionScope);
  const enabled = options.enabled ?? true;
  const cached = cacheGet(scopedKey) as T | undefined;
  const initial = cached !== undefined ? cached : (options.initialData ?? null);
  const [data, setData] = useState<T | null>(initial);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(enabled && cached === undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const activeRef = useRef(true);

  // Ref-based capture: callers can pass inline arrows without triggering reload loops.
  // Re-fetching on data change is keyed by `key`, not by function identity.
  const queryFnRef = useRef(queryFn);
  useEffect(() => { queryFnRef.current = queryFn; });
  const initialDataRef = useRef(options.initialData);
  useEffect(() => { initialDataRef.current = options.initialData; });

  const reload = useCallback(async () => {
    if (!enabled) return;
    if (inflight.has(scopedKey)) {
      try {
        await inflight.get(scopedKey);
        if (!activeRef.current) return;
        const shared = cacheGet(scopedKey) as T | undefined;
        setData(shared !== undefined ? shared : (initialDataRef.current ?? null));
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
      return;
    }
    const hasCached = cacheGet(scopedKey) !== undefined;
    if (hasCached) setIsRefreshing(true);
    else setIsLoading(true);
    const promise = (async () => {
      const next = await queryFnRef.current();
      if (!activeRef.current) return;
      cacheSet(scopedKey, next);
      setData(next);
      setError(null);
    })();
    inflight.set(scopedKey, promise);
    try {
      await promise;
    } catch (err) {
      if (!activeRef.current) return;
      setError(err instanceof Error ? err : new Error('Request failed.'));
    } finally {
      inflight.delete(scopedKey);
      if (activeRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [enabled, scopedKey]);

  useEffect(() => {
    if (!enabled) {
      setData(initialDataRef.current ?? null);
      setError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    const hit = cacheGet(scopedKey) as T | undefined;
    setData(hit !== undefined ? hit : (initialDataRef.current ?? null));
    setError(null);
    setIsLoading(hit === undefined);
    setIsRefreshing(false);
  }, [enabled, scopedKey]);

  useEffect(() => {
    activeRef.current = true;
    if (!enabled) {
      setIsLoading(false);
      return () => { activeRef.current = false; };
    }
    const hit = cacheGet(scopedKey);
    if (hit !== undefined) {
      setData(hit as T);
      setIsLoading(false);
    }
    reload();
    return () => {
      activeRef.current = false;
    };
  }, [enabled, scopedKey, reload]);

  const isEmpty = !isLoading && !error && Array.isArray(data) && data.length === 0;
  return { data, error, isLoading, isRefreshing, isEmpty, reload };
}
