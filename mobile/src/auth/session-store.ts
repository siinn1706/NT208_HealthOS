import * as SecureStore from 'expo-secure-store';
import type { AuthToken, CurrentUser } from '../../../shared/api-contracts';

const TOKEN_KEY = 'healthos.mobile.access_token';
const USER_KEY = 'healthos.mobile.user';

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getCachedUser(): Promise<CurrentUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    await SecureStore.deleteItemAsync(USER_KEY);
    return null;
  }
}

export async function saveAuthToken(token: AuthToken): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token.access_token);
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
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
