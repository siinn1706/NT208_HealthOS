/* eslint-env jest */
import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { SessionProvider, useSession } from '../auth/session-provider';
import { profileService } from '../api/services';
import { clearStoredSession, getAccessToken, getCachedUser } from '../auth/session-store';
import { setApiSessionScope } from '../api/query';
import type { CurrentUser } from '../types/api';

jest.mock('../api/client', () => ({
  setRefreshHandler: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));

jest.mock('../api/core-reachability', () => ({
  BOOTSTRAP_PROFILE_TIMEOUT_MS: 5000,
  toCoreReachabilityMessage: jest.fn(() => null),
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  setApiSessionScope: jest.fn(),
}));

jest.mock('../api/services', () => ({
  authService: {
    login: jest.fn(),
    signInWithOAuth: jest.fn(),
    verifyLoginMfa: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  },
  profileService: {
    me: jest.fn(),
    updateMe: jest.fn(),
  },
}));

jest.mock('../auth/session-store', () => ({
  clearStoredSession: jest.fn(),
  getAccessToken: jest.fn(),
  getCachedUser: jest.fn(),
  getSessionEpoch: jest.fn(),
  saveAuthToken: jest.fn(),
  saveCurrentUser: jest.fn(),
}));

const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockGetCachedUser = getCachedUser as jest.MockedFunction<typeof getCachedUser>;
const mockClearStoredSession = clearStoredSession as jest.MockedFunction<typeof clearStoredSession>;
const mockProfileService = profileService as jest.Mocked<typeof profileService>;
const mockSetApiSessionScope = setApiSessionScope as jest.MockedFunction<typeof setApiSessionScope>;

const cachedUser: CurrentUser = {
  id: 'user-1',
  email: 'person@example.com',
  username: 'person',
  display_name: 'Person',
  avatar_url: null,
  onboarding_status: 'pending_setup',
  onboarding_completed_at: null,
};

const freshUser: CurrentUser = {
  ...cachedUser,
  onboarding_status: 'complete',
};

function BootstrapProbe() {
  const session = useSession();
  return (
    <>
      <Text testID="booting">{session.booting ? 'booting' : 'ready'}</Text>
      <Text testID="authenticated">{session.authenticated ? 'authenticated' : 'signed-out'}</Text>
      <Text testID="user-id">{session.user?.id ?? 'none'}</Text>
      <Text testID="error">{session.error ?? 'none'}</Text>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCachedUser.mockResolvedValue(null);
  mockGetAccessToken.mockResolvedValue(null);
  mockClearStoredSession.mockResolvedValue(undefined);
  mockProfileService.me.mockResolvedValue(freshUser);
});

describe('SessionProvider bootstrap guard', () => {
  it('completes booting and loads refreshed user after successful bootstrap', async () => {
    mockGetCachedUser.mockResolvedValue(cachedUser);
    mockGetAccessToken.mockResolvedValue('access-token');
    mockProfileService.me.mockResolvedValue(freshUser);

    const { getByTestId } = render(
      <SessionProvider>
        <BootstrapProbe />
      </SessionProvider>,
    );

    await waitFor(() => expect(getByTestId('booting').props.children).toBe('ready'));
    await waitFor(() => expect(getByTestId('authenticated').props.children).toBe('authenticated'));
    expect(getByTestId('user-id').props.children).toBe('user-1');
    expect(getByTestId('error').props.children).toBe('none');
    expect(mockProfileService.me).toHaveBeenCalledWith({ timeoutMs: 5000 });
    expect(mockSetApiSessionScope).toHaveBeenCalledWith('user-1');
    expect(mockClearStoredSession).not.toHaveBeenCalled();
  });

  it('clears session and surfaces error when bootstrap dependencies throw', async () => {
    mockGetCachedUser.mockResolvedValue(cachedUser);
    mockGetAccessToken.mockRejectedValue(new Error('secure-store failed'));

    const { getByTestId } = render(
      <SessionProvider>
        <BootstrapProbe />
      </SessionProvider>,
    );

    await waitFor(() => expect(getByTestId('booting').props.children).toBe('ready'));
    expect(getByTestId('error').props.children).toBe('secure-store failed');
    expect(getByTestId('authenticated').props.children).toBe('signed-out');
    expect(getByTestId('user-id').props.children).toBe('none');
    expect(mockClearStoredSession).toHaveBeenCalledTimes(1);
    expect(mockSetApiSessionScope).toHaveBeenLastCalledWith(null);
    expect(mockProfileService.me).not.toHaveBeenCalled();
  });
});
