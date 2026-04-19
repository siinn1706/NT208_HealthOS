"use client";

import * as React from "react";
import { track } from "@/lib/analytics";

export type ConnectionStatus = "online" | "offline" | "reconnecting";

interface ConnectionContextValue {
  status: ConnectionStatus;
  /** True when the most recent transition flipped the network to "online". */
  recentlyReconnected: boolean;
}

const ConnectionContext = React.createContext<ConnectionContextValue>({
  status: "online",
  recentlyReconnected: false,
});

const RECONNECT_GRACE_MS = 1500;

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<ConnectionStatus>("online");
  const [recentlyReconnected, setRecentlyReconnected] = React.useState(false);
  const reconnectTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus("offline");
    }

    const handleOnline = () => {
      setStatus("reconnecting");
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = window.setTimeout(() => {
        setStatus("online");
        setRecentlyReconnected(true);
        track("shell.connection.online");
        window.setTimeout(() => setRecentlyReconnected(false), 4000);
      }, RECONNECT_GRACE_MS);
    };
    const handleOffline = () => {
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      setStatus("offline");
      track("shell.connection.offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
    };
  }, []);

  const value = React.useMemo(
    () => ({ status, recentlyReconnected }),
    [status, recentlyReconnected],
  );

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return React.useContext(ConnectionContext);
}
