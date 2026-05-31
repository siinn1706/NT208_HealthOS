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
const queryRevisions = new Map<string, number>();
let globalQueryRevision = 0;
type InvalidationListener = (prefix?: string, invalidatedInflightKeys?: ReadonlySet<string>) => void;
const invalidationListeners = new Set<InvalidationListener>();

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

function matchesInvalidationPrefix(scopedKey: string, prefix?: string): boolean {
  const normalizedPrefix = prefix?.trim();
  if (!normalizedPrefix) return true;
  const unscoped = fromScopedKey(scopedKey);
  return scopedKey.startsWith(normalizedPrefix) || unscoped.startsWith(normalizedPrefix);
}

function notifyInvalidation(prefix?: string, invalidatedInflightKeys?: ReadonlySet<string>) {
  invalidationListeners.forEach((listener) => listener(prefix, invalidatedInflightKeys));
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

function getQueryRevision(scopedKey: string): number {
  return Math.max(globalQueryRevision, queryRevisions.get(scopedKey) ?? 0);
}

function bumpQueryRevision(scopedKey: string) {
  queryRevisions.set(scopedKey, getQueryRevision(scopedKey) + 1);
}

interface ApiQueryState<T> {
  scopedKey: string;
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRefreshing: boolean;
}

function createApiQueryState<T>(
  scopedKey: string,
  enabled: boolean,
  cached: T | undefined,
  initialData: T | null,
): ApiQueryState<T> {
  return {
    scopedKey,
    data: cached !== undefined ? cached : initialData,
    error: null,
    isLoading: enabled && cached === undefined,
    isRefreshing: false,
  };
}

export function setApiSessionScope(scope: string | null | undefined) {
  activeSessionScope = normalizeScope(scope);
}

export function invalidateApiQuery(prefix?: string) {
  if (!prefix) {
    memoryCache.clear();
    inflight.clear();
    queryRevisions.clear();
    globalQueryRevision += 1;
    return;
  }
  const normalizedPrefix = prefix.trim();
  if (!normalizedPrefix) {
    memoryCache.clear();
    inflight.clear();
    queryRevisions.clear();
    globalQueryRevision += 1;
    return;
  }
  const invalidatedKeys = new Set<string>();
  const invalidatedInflightKeys = new Set<string>();
  Array.from(memoryCache.keys()).forEach((key) => {
    if (matchesInvalidationPrefix(key, normalizedPrefix)) {
      invalidatedKeys.add(key);
      memoryCache.delete(key);
    }
  });
  Array.from(inflight.keys()).forEach((key) => {
    if (matchesInvalidationPrefix(key, normalizedPrefix)) {
      invalidatedKeys.add(key);
      invalidatedInflightKeys.add(key);
      inflight.delete(key);
    }
  });
  invalidatedKeys.forEach(bumpQueryRevision);
  notifyInvalidation(normalizedPrefix, invalidatedInflightKeys);
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
  const initialData = options.initialData ?? null;
  const initialState = createApiQueryState(scopedKey, enabled, cached, initialData);
  const [queryState, setQueryState] = useState<ApiQueryState<T>>(() => initialState);
  const currentState = queryState.scopedKey === scopedKey ? queryState : initialState;
  const activeRef = useRef(true);
  const requestSeq = useRef(0);

  // Ref-based capture: callers can pass inline arrows without triggering reload loops.
  // Re-fetching on data change is keyed by `key`, not by function identity.
  const queryFnRef = useRef(queryFn);
  useEffect(() => { queryFnRef.current = queryFn; });
  const initialDataRef = useRef(options.initialData);
  useEffect(() => { initialDataRef.current = options.initialData; });

  const reload = useCallback(async () => {
    if (!enabled) return;
    const requestId = ++requestSeq.current;
    const revisionAtStart = getQueryRevision(scopedKey);
    const isSameMountedRequest = () => activeRef.current && requestId === requestSeq.current;
    const isCurrentRequest = () => (
      isSameMountedRequest()
      && getQueryRevision(scopedKey) === revisionAtStart
    );
    const clearLoadingForSameRequest = () => {
      if (!isSameMountedRequest()) return;
      setQueryState((prev) => (
        prev.scopedKey === scopedKey
          ? { ...prev, isLoading: false, isRefreshing: false }
          : prev
      ));
    };

    if (inflight.has(scopedKey)) {
      try {
        await inflight.get(scopedKey);
        if (!isCurrentRequest()) return;
        const shared = cacheGet(scopedKey) as T | undefined;
        setQueryState({
          scopedKey,
          data: shared !== undefined ? shared : (initialDataRef.current ?? null),
          error: null,
          isLoading: false,
          isRefreshing: false,
        });
      } catch (err) {
        if (!isCurrentRequest()) return;
        setQueryState((prev) => ({
          scopedKey,
          data: prev.scopedKey === scopedKey ? prev.data : (initialDataRef.current ?? null),
          error: err instanceof Error ? err : new Error('Request failed.'),
          isLoading: false,
          isRefreshing: false,
        }));
      } finally {
        clearLoadingForSameRequest();
      }
      return;
    }
    const hasCached = cacheGet(scopedKey) !== undefined;
    setQueryState((prev) => ({
      scopedKey,
      data: prev.scopedKey === scopedKey ? prev.data : (initialDataRef.current ?? null),
      error: null,
      isLoading: !hasCached,
      isRefreshing: hasCached,
    }));
    const promise = (async () => {
      const next = await queryFnRef.current();
      if (!isCurrentRequest()) return;
      cacheSet(scopedKey, next);
      setQueryState({
        scopedKey,
        data: next,
        error: null,
        isLoading: false,
        isRefreshing: false,
      });
    })();
    inflight.set(scopedKey, promise);
    try {
      await promise;
    } catch (err) {
      if (!isCurrentRequest()) return;
      setQueryState((prev) => ({
        scopedKey,
        data: prev.scopedKey === scopedKey ? prev.data : (initialDataRef.current ?? null),
        error: err instanceof Error ? err : new Error('Request failed.'),
        isLoading: false,
        isRefreshing: false,
      }));
    } finally {
      if (inflight.get(scopedKey) === promise) {
        inflight.delete(scopedKey);
      }
      clearLoadingForSameRequest();
    }
  }, [enabled, scopedKey]);

  useEffect(() => {
    activeRef.current = true;
    if (!enabled) {
      requestSeq.current += 1;
      return () => { activeRef.current = false; };
    }
    reload();
    return () => {
      activeRef.current = false;
      requestSeq.current += 1;
    };
  }, [enabled, scopedKey, reload]);

  useEffect(() => {
    if (!enabled) return undefined;
    const listener: InvalidationListener = (prefix, invalidatedInflightKeys) => {
      if (invalidatedInflightKeys?.has(scopedKey)) return;
      if (matchesInvalidationPrefix(scopedKey, prefix)) {
        void reload();
      }
    };
    invalidationListeners.add(listener);
    return () => {
      invalidationListeners.delete(listener);
    };
  }, [enabled, reload, scopedKey]);

  const isEmpty = !currentState.isLoading && !currentState.error && Array.isArray(currentState.data) && currentState.data.length === 0;
  return {
    data: currentState.data,
    error: currentState.error,
    isLoading: currentState.isLoading,
    isRefreshing: currentState.isRefreshing,
    isEmpty,
    reload,
  };
}
