import React, { createContext, useContext, useEffect, useState } from "react";
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

  return (
    <NetworkContext.Provider value={{ isOnline, type }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkStatus() {
  return useContext(NetworkContext);
}
