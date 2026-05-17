import * as SecureStore from 'expo-secure-store';
import {
  getAccessToken,
  getRefreshToken,
  getCachedUser,
  saveAuthToken,
  saveCurrentUser,
  clearStoredSession,
} from '../auth/session-store';
import type { AuthToken, CurrentUser } from '../../../shared/api-contracts';

jest.mock('expo-secure-store');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const TOKEN_KEY   = 'healthos.mobile.access_token';
const REFRESH_KEY = 'healthos.mobile.refresh_token';
const USER_KEY    = 'healthos.mobile.user';

const mockToken: AuthToken = {
  access_token: 'test-access-token',
  token_type: 'bearer',
  user_id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  display_name: 'Test User',
  avatar_url: null,
  onboarding_status: 'complete',
};

const mockUser: CurrentUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  display_name: 'Test User',
  avatar_url: null,
  onboarding_status: 'complete',
  onboarding_completed_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getRefreshToken', () => {
  it('returns refresh token from SecureStore', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce('rt-tok');
    const result = await getRefreshToken();
    expect(result).toBe('rt-tok');
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(REFRESH_KEY);
  });

  it('returns null when no refresh token stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce(null);
    expect(await getRefreshToken()).toBeNull();
  });
});

describe('getAccessToken', () => {
  it('returns token from SecureStore', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce('test-access-token');
    const result = await getAccessToken();
    expect(result).toBe('test-access-token');
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
  });

  it('returns null when no token stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce(null);
    expect(await getAccessToken()).toBeNull();
  });
});

describe('getCachedUser', () => {
  it('returns parsed user from SecureStore', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify(mockUser));
    const result = await getCachedUser();
    expect(result).toEqual(mockUser);
  });

  it('returns null when nothing stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce(null);
    expect(await getCachedUser()).toBeNull();
  });

  it('deletes and returns null on corrupt JSON', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce('not-json{');
    mockSecureStore.deleteItemAsync.mockResolvedValueOnce();
    const result = await getCachedUser();
    expect(result).toBeNull();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(USER_KEY);
  });
});

describe('saveAuthToken', () => {
  it('stores access token and derived user object', async () => {
    mockSecureStore.setItemAsync.mockResolvedValue();
    mockSecureStore.deleteItemAsync.mockResolvedValue();
    await saveAuthToken(mockToken);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, 'test-access-token');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      USER_KEY,
      expect.stringContaining('"id":"user-123"'),
    );
    // no refresh_token on mockToken → REFRESH_KEY should be deleted (C2 fix)
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(REFRESH_KEY);
  });

  it('stores refresh token when present', async () => {
    mockSecureStore.setItemAsync.mockResolvedValue();
    await saveAuthToken({ ...mockToken, refresh_token: 'rt-tok' });
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(REFRESH_KEY, 'rt-tok');
  });
});

describe('saveCurrentUser', () => {
  it('stores serialised user', async () => {
    mockSecureStore.setItemAsync.mockResolvedValue();
    await saveCurrentUser(mockUser);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(USER_KEY, JSON.stringify(mockUser));
  });
});

describe('clearStoredSession', () => {
  it('deletes all three keys', async () => {
    mockSecureStore.deleteItemAsync.mockResolvedValue();
    await clearStoredSession();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(REFRESH_KEY);
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(USER_KEY);
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
  });
});
