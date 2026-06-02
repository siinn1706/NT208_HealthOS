import React, { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setRefreshHandler, setUnauthorizedHandler } from '../api/client';
import { BOOTSTRAP_PROFILE_TIMEOUT_MS, toCoreReachabilityMessage } from '../api/core-reachability';
import { invalidateApiQuery, setApiSessionScope } from '../api/query';
import { authService, profileService } from '../api/services';
import { clearQueuedChatImageUploadsForUser } from '../api/services/chat-offline-queue';
import { clearQueuedMealScanPhotos } from '../api/services/meal-offline-queue';
import {
  clearStoredSession,
  getAccessToken,
  getCachedUser,
  getSessionEpoch,
  saveAuthToken,
  saveCurrentUser,
} from './session-store';
import type { AuthLoginResult, AuthToken, CurrentUser, MfaLoginRequired, UserProfileUpdate } from '../types/api';

interface SignInResult {
  mfaRequired: boolean;
  challengeId?: string;
  expiresInSeconds?: number;
  user?: CurrentUser;
}

interface SessionContextValue {
  user: CurrentUser | null;
  booting: boolean;
  authenticated: boolean;
  error: string | null;
  signIn: (identifier: string, password: string) => Promise<SignInResult>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<CurrentUser>;
  completeMfaSignIn: (challengeId: string, code: string) => Promise<CurrentUser>;
  signOut: () => Promise<void>;
  refreshUser: (options?: RefreshUserOptions) => Promise<CurrentUser | null>;
  updateProfile: (body: UserProfileUpdate) => Promise<CurrentUser>;
  clearSession: () => Promise<void>;
}

interface RefreshUserOptions {
  timeoutMs?: number;
  throwOnFailure?: boolean;
}

function describeBootstrapError(error: unknown) {
  return toCoreReachabilityMessage(error) ?? (error instanceof Error ? error.message : 'Unable to initialize session.');
}

const SessionContext = createContext<SessionContextValue | null>(null);

function isMfaChallenge(result: AuthLoginResult): result is MfaLoginRequired {
  return 'mfa_required' in result && result.mfa_required === true;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const clearOfflineQueues = useCallback(async () => {
    const cached = userIdRef.current ? null : await getCachedUser().catch(() => null);
    const queueUserId = userIdRef.current ?? cached?.id ?? null;
    await Promise.allSettled([
      queueUserId ? clearQueuedChatImageUploadsForUser(queueUserId) : Promise.resolve(),
      clearQueuedMealScanPhotos(),
    ]);
  }, []);

  const clearSession = useCallback(async () => {
    await clearOfflineQueues();
    invalidateApiQuery();
    setApiSessionScope(null);
    await clearStoredSession();
    setUser(null);
    setError(null);
  }, [clearOfflineQueues]);

  const refreshUser = useCallback(async (options: RefreshUserOptions = {}) => {
    try {
      const next = await profileService.me({ timeoutMs: options.timeoutMs });
      await saveCurrentUser(next);
      setApiSessionScope(next.id);
      setUser(next);
      setError(null);
      return next;
    } catch (err) {
      const message = toCoreReachabilityMessage(err) ?? (err instanceof Error ? err.message : 'Unable to refresh session.');
      setError(message);
      if (options.throwOnFailure) throw new Error(message);
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
      try {
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
          return;
        }
        await refreshUser({ timeoutMs: BOOTSTRAP_PROFILE_TIMEOUT_MS });
      } catch (error) {
        if (active) {
          setUser(null);
          setApiSessionScope(null);
          invalidateApiQuery();
          try {
            await clearStoredSession();
          } catch {
            // Keep the original bootstrap error if secure storage cleanup fails.
          }
          setError(describeBootstrapError(error));
        }
      } finally {
        if (active) {
          setBooting(false);
        }
      }
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
    if (isMfaChallenge(loginResult)) {
      return {
        mfaRequired: true,
        challengeId: loginResult.challenge_id,
        expiresInSeconds: loginResult.expires_in_seconds,
      };
    }
    const tokenResult = loginResult as AuthToken;
    invalidateApiQuery();
    setApiSessionScope(tokenResult.user_id);
    await saveAuthToken(tokenResult);
    try {
      const nextUser = await refreshUser({ throwOnFailure: true });
      if (!nextUser) throw new Error('Unable to refresh session.');
      return { mfaRequired: false, user: nextUser };
    } catch (err) {
      await clearSession();
      throw err;
    }
  }, [clearSession, refreshUser]);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    const tokenResult = await authService.signInWithOAuth(provider);
    invalidateApiQuery();
    setApiSessionScope(tokenResult.user_id);
    try {
      const nextUser = await refreshUser({ throwOnFailure: true });
      if (!nextUser) throw new Error('Unable to refresh session.');
      return nextUser;
    } catch (err) {
      await clearSession();
      throw err;
    }
  }, [clearSession, refreshUser]);

  const completeMfaSignIn = useCallback(async (challengeId: string, code: string) => {
    const token = await authService.verifyLoginMfa(challengeId, code);
    invalidateApiQuery();
    setApiSessionScope(token.user_id);
    try {
      const nextUser = await refreshUser({ throwOnFailure: true });
      if (!nextUser) throw new Error('Unable to refresh session.');
      return nextUser;
    } catch (err) {
      await clearSession();
      throw err;
    }
  }, [clearSession, refreshUser]);

  const signOut = useCallback(async () => {
    await authService.logout();
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
      signInWithOAuth,
      completeMfaSignIn,
      signOut,
      refreshUser,
      updateProfile,
      clearSession,
    }),
    [booting, clearSession, completeMfaSignIn, error, refreshUser, signIn, signInWithOAuth, signOut, updateProfile, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
