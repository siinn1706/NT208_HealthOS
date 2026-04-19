import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

interface NetworkContextValue {
  isOnline: boolean;
  type: string | null;
}

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: true,
  type: null,
});

function deriveIsOnline(state: NetInfoState): boolean {
  // `isInternetReachable` is null on cold start until the first probe completes;
  // treat null as "assume reachable" to avoid false offline banners.
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

// Wire NetInfo into TanStack Query so queries pause cleanly while offline
// instead of relying on the (unreliable on RN) global navigator.onLine.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(deriveIsOnline(state));
  });
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(deriveIsOnline(state));
      setType(state.type ?? null);
    });
    NetInfo.fetch().then((state) => {
      setIsOnline(deriveIsOnline(state));
      setType(state.type ?? null);
    });
    return unsubscribe;
  }, []);

  // Memoize the context value so consumers don't re-render when this
  // Provider re-renders for unrelated reasons (e.g. parent state
  // changes). The shape is just two primitives, so the comparison is
  // cheap and the win is real: every screen reads `useNetworkStatus`
  // through `<OfflineBanner>` and various offline-aware controls.
  const value = useMemo(() => ({ isOnline, type }), [isOnline, type]);

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkStatus() {
  return useContext(NetworkContext);
}
