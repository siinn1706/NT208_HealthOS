import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setRefreshHandler, setUnauthorizedHandler } from '../api/client';
import { invalidateApiQuery, setApiSessionScope } from '../api/query';
import { authService, profileService } from '../api/services';
import {
  clearStoredSession,
  getAccessToken,
  getCachedUser,
  getSessionEpoch,
  saveAuthToken,
  saveCurrentUser,
} from './session-store';
import type { CurrentUser, UserProfileUpdate } from '../../../shared/api-contracts';

interface SignInResult {
  mfaRequired: boolean;
  challengeId?: string;
  expiresInSeconds?: number;
}

interface SessionContextValue {
  user: CurrentUser | null;
  booting: boolean;
  authenticated: boolean;
  error: string | null;
  signIn: (identifier: string, password: string) => Promise<SignInResult>;
  completeMfaSignIn: (challengeId: string, code: string) => Promise<void>;
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
    invalidateApiQuery();
    setApiSessionScope(null);
    await clearStoredSession();
    setUser(null);
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const next = await profileService.me();
      await saveCurrentUser(next);
      setApiSessionScope(next.id);
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
      const startEpoch = getSessionEpoch();
      try {
        await authService.refreshToken();
        // If logout happened while refresh was in-flight, discard the new token
        if (getSessionEpoch() !== startEpoch) return false;
        return true;
      } catch {
        return false;
      }
    });
    let active = true;

    async function bootstrap() {
      const cached = await getCachedUser();
      if (cached) {
        setApiSessionScope(cached.id);
      } else {
        setApiSessionScope(null);
      }
      if (active && cached) setUser(cached);
      const token = await getAccessToken();
      if (!token) {
        if (cached) await clearSession();
        if (active) setBooting(false);
        return;
      }
      await refreshUser();
      if (active) setBooting(false);
    }

    bootstrap();
    return () => {
      active = false;
      setUnauthorizedHandler(null);
      setRefreshHandler(null);
    };
  }, [clearSession, refreshUser]);

  const signIn = useCallback(async (identifier: string, password: string): Promise<SignInResult> => {
    const loginResult = await authService.login(identifier, password);
    if ('mfa_required' in loginResult && loginResult.mfa_required) {
      return {
        mfaRequired: true,
        challengeId: loginResult.challenge_id,
        expiresInSeconds: loginResult.expires_in_seconds,
      };
    }
    invalidateApiQuery();
    setApiSessionScope(loginResult.user_id);
    await saveAuthToken(loginResult);
    await refreshUser();
    return { mfaRequired: false };
  }, [refreshUser]);

  const completeMfaSignIn = useCallback(async (challengeId: string, code: string) => {
    const token = await authService.verifyLoginMfa(challengeId, code);
    invalidateApiQuery();
    setApiSessionScope(token.user_id);
    await refreshUser();
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    await authService.logout().catch((e: unknown) => {
      if (__DEV__) console.warn('[SessionProvider] logout network error:', e);
    });
    invalidateApiQuery();
    setApiSessionScope(null);
    setUser(null);
    setError(null);
  }, []);

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
      completeMfaSignIn,
      signOut,
      refreshUser,
      updateProfile,
      clearSession,
    }),
    [booting, clearSession, completeMfaSignIn, error, refreshUser, signIn, signOut, updateProfile, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
