import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setRefreshHandler, setUnauthorizedHandler } from '../api/client';
import { authService, profileService } from '../api/services';
import {
  clearStoredSession,
  getAccessToken,
  getCachedUser,
  saveAuthToken,
  saveCurrentUser,
} from './session-store';
import type { CurrentUser, UserProfileUpdate } from '../../../shared/api-contracts';

interface SessionContextValue {
  user: CurrentUser | null;
  booting: boolean;
  authenticated: boolean;
  error: string | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<CurrentUser | null>;
  updateProfile: (body: UserProfileUpdate) => Promise<CurrentUser>;
  clearSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(async () => {
    await clearStoredSession();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const next = await profileService.me();
      await saveCurrentUser(next);
      setUser(next);
      setError(null);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to refresh session.';
      setError(message);
      return null;
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    setRefreshHandler(async () => {
      try {
        await authService.refreshToken();
        return true;
      } catch {
        return false;
      }
    });
    let active = true;

    async function bootstrap() {
      const cached = await getCachedUser();
      if (active && cached) setUser(cached);
      const token = await getAccessToken();
      if (token) await refreshUser();
      if (active) setBooting(false);
    }

    bootstrap();
    return () => {
      active = false;
      setUnauthorizedHandler(null);
      setRefreshHandler(null);
    };
  }, [clearSession, refreshUser]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const token = await authService.login(identifier, password);
    await saveAuthToken(token);
    await refreshUser();
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    await authService.logout().catch((e: unknown) => {
      if (__DEV__) console.warn('[SessionProvider] logout network error:', e);
    });
    await clearSession();
  }, [clearSession]);

  const updateProfile = useCallback(async (body: UserProfileUpdate) => {
    const next = await profileService.updateMe(body);
    await saveCurrentUser(next);
    setUser(next);
    return next;
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      booting,
      authenticated: Boolean(user),
      error,
      signIn,
      signOut,
      refreshUser,
      updateProfile,
      clearSession,
    }),
    [booting, clearSession, error, refreshUser, signIn, signOut, updateProfile, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
