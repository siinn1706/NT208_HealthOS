import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Returns true when the device has no internet connectivity.
 * Uses @react-native-community/netinfo (already a project dependency).
 * Falls back to false (assume online) if the subscription never fires.
 */
export function useIsOffline(): boolean {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsubscribe();
  }, []);

  return offline;
}
