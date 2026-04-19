import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ApiError } from "./errors";

const PERSIST_KEY = "healthos.query-cache.v1";
const PERSIST_THROTTLE_MS = 1_000;
const ONE_DAY_MS = 24 * 60 * 60_000;

export function createQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry(failureCount, error) {
          if (error instanceof ApiError) {
            if (error.code === "AUTH_EXPIRED" || error.code === "AUTH_REQUIRED")
              return false;
            if (error.status >= 400 && error.status < 500) return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  });

  // Persist server-state cache across cold starts so the app can render
  // last-known data instantly while it revalidates in the background. The
  // 24h max age guards against stale dashboards forever; auth-bound caches
  // are dropped via the dehydrate filter below.
  const persister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: PERSIST_KEY,
    throttleTime: PERSIST_THROTTLE_MS,
  });

  persistQueryClient({
    queryClient: client,
    persister,
    maxAge: ONE_DAY_MS,
    dehydrateOptions: {
      shouldDehydrateQuery: (q) => {
        if (q.state.status !== "success") return false;
        // Never persist authentication-side queries — re-fetched on launch.
        const head = String(q.queryKey[0] ?? "");
        if (head === "auth" || head === "mfa" || head === "security-logs") {
          return false;
        }
        return true;
      },
    },
  });

  return client;
}
