import React, { createContext, use, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View, type AppStateStatus } from 'react-native';
import { Button } from '../components/primitives/button';
import { Card } from '../components/primitives/card';
import { IconLock, IconLogOut, IconShield } from '../icons';
import { typography } from '../theme/typography';
import { useTheme } from '../theme/useTheme';
import { useSession } from './session-provider';
import {
  authenticateAppLock,
  getAppLockAvailability,
  isAppLockEnabled,
  setAppLockEnabled,
  subscribeAppLockEnabled,
} from './app-lock-service';

interface AppLockContextValue {
  enabled: boolean;
  refresh: () => Promise<void>;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

function movedToForeground(previous: AppStateStatus, next: AppStateStatus) {
  return (previous === 'inactive' || previous === 'background') && next === 'active';
}

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const { authenticated, booting, signOut } = useSession();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const authenticatingRef = useRef(false);
  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlock = useCallback(async () => {
    if (authenticatingRef.current) return;
    authenticatingRef.current = true;
    setAuthenticating(true);
    setError(null);
    try {
      const ok = await authenticateAppLock();
      if (ok) {
        setLocked(false);
      } else {
        setError('Unlock was cancelled or failed.');
      }
    } finally {
      authenticatingRef.current = false;
      setAuthenticating(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (booting || !authenticated) {
      setChecking(false);
      setEnabled(false);
      setLocked(false);
      return;
    }

    setChecking(true);
    const nextEnabled = await isAppLockEnabled();
    setEnabled(nextEnabled);
    if (!nextEnabled) {
      setLocked(false);
      setChecking(false);
      return;
    }

    const availability = await getAppLockAvailability();
    if (!availability.available) {
      await setAppLockEnabled(false);
      setEnabled(false);
      setLocked(false);
      setChecking(false);
      return;
    }

    setLocked(true);
    setChecking(false);
    await unlock();
  }, [authenticated, booting, unlock]);

  useEffect(() => {
    let active = true;
    refresh().finally(() => {
      if (active) setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => subscribeAppLockEnabled((nextEnabled) => {
    setEnabled(nextEnabled);
    if (!nextEnabled) setLocked(false);
  }), []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      const previous = appState.current;
      appState.current = nextState;
      if (!movedToForeground(previous, nextState)) return;
      await refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const value = { enabled, refresh };

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign out.');
    } finally {
      setSigningOut(false);
    }
  }

  if (authenticated && (checking || locked)) {
    return (
      <AppLockContext.Provider value={value}>
        <View style={[styles.lockRoot, { backgroundColor: t.bg }]}>
          <Card style={styles.lockCard}>
            <View style={[styles.lockIcon, { backgroundColor: t.brandSoft }]}>
              <IconShield size={28} color={t.brand} />
            </View>
            <Text style={[typography.title, styles.center, { color: t.ink }]}>HealthOS is locked</Text>
            <Text style={[typography.body, styles.center, { color: t.ink3 }]}>
              Use device biometrics to unlock your health data.
            </Text>
            {error && <Text style={[typography.caption, styles.center, { color: t.danger }]}>{error}</Text>}
            <Button
              label={authenticating ? 'Unlocking...' : 'Unlock'}
              icon={<IconLock size={16} color="#FFFFFF" />}
              loading={authenticating}
              onPress={unlock}
              style={styles.action}
            />
            <Button
              label={signingOut ? 'Signing out...' : 'Sign out'}
              variant="ghost"
              icon={<IconLogOut size={16} color={t.ink} />}
              disabled={authenticating || signingOut}
              onPress={handleSignOut}
              style={styles.action}
            />
          </Card>
        </View>
      </AppLockContext.Provider>
    );
  }

  return (
    <AppLockContext.Provider value={value}>
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const value = use(AppLockContext);
  if (!value) throw new Error('useAppLock must be used inside AppLockProvider');
  return value;
}

const styles = StyleSheet.create({
  lockRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockCard: { width: '100%', maxWidth: 420, alignItems: 'center', gap: 14 },
  lockIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  action: { width: '100%' },
});
