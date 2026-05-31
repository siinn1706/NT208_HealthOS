import * as SecureStore from 'expo-secure-store';
import type { AuthToken, CurrentUser } from '../types/api';

const TOKEN_KEY   = 'healthos.mobile.access_token';
const REFRESH_KEY = 'healthos.mobile.refresh_token';
const USER_KEY    = 'healthos.mobile.user';

/** undefined = not yet loaded from SecureStore; null = confirmed absent */
let cachedToken: string | null | undefined = undefined;

/** Incremented on every clearStoredSession call; used by refresh handler to detect logout races. */
let sessionEpoch = 0;
export function getSessionEpoch() { return sessionEpoch; }
export function bumpSessionEpoch() { sessionEpoch += 1; }

export async function getAccessToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return cachedToken;
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function getCachedUser(): Promise<CurrentUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== 'object' || typeof (obj as Record<string, unknown>).id !== 'string' || typeof (obj as Record<string, unknown>).email !== 'string') {
      await SecureStore.deleteItemAsync(USER_KEY);
      return null;
    }
    return obj as CurrentUser;
  } catch {
    await SecureStore.deleteItemAsync(USER_KEY);
    return null;
  }
}

export async function saveAuthToken(token: AuthToken): Promise<void> {
  cachedToken = token.access_token;
  await SecureStore.setItemAsync(TOKEN_KEY, token.access_token);
  if (token.refresh_token) {
    await SecureStore.setItemAsync(REFRESH_KEY, token.refresh_token);
  } else {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  }
  await SecureStore.setItemAsync(
    USER_KEY,
    JSON.stringify({
      id: token.user_id,
      email: token.email,
      username: token.username ?? null,
      display_name: token.display_name,
      avatar_url: token.avatar_url ?? null,
      onboarding_status: token.onboarding_status,
      onboarding_completed_at: null,
    } satisfies CurrentUser),
  );
}

export async function saveCurrentUser(user: CurrentUser): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearStoredSession(): Promise<void> {
  bumpSessionEpoch();
  cachedToken = undefined;
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
