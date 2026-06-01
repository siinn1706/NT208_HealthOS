/* eslint-env jest */
import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SessionProvider, useSession } from '../auth/session-provider';
import { authService, profileService } from '../api/services';
import {
  clearStoredSession,
  getAccessToken,
  getCachedUser,
  getSessionEpoch,
  saveAuthToken,
  saveCurrentUser,
} from '../auth/session-store';
import type { AuthToken, CurrentUser } from '../types/api';

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

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockProfileService = profileService as jest.Mocked<typeof profileService>;
const mockClearStoredSession = clearStoredSession as jest.MockedFunction<typeof clearStoredSession>;
const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockGetCachedUser = getCachedUser as jest.MockedFunction<typeof getCachedUser>;
const mockGetSessionEpoch = getSessionEpoch as jest.MockedFunction<typeof getSessionEpoch>;
const mockSaveAuthToken = saveAuthToken as jest.MockedFunction<typeof saveAuthToken>;
const mockSaveCurrentUser = saveCurrentUser as jest.MockedFunction<typeof saveCurrentUser>;

const token: AuthToken = {
  access_token: 'access',
  token_type: 'bearer',
  refresh_token: 'refresh',
  user_id: 'user-1',
  email: 'person@example.com',
  username: null,
  display_name: 'Person',
  avatar_url: null,
  onboarding_status: 'complete',
};

const currentUser: CurrentUser = {
  id: 'user-1',
  email: 'person@example.com',
  username: null,
  display_name: 'Person',
  avatar_url: null,
  onboarding_status: 'complete',
  onboarding_completed_at: null,
};

function SignInProbe({ mode, onResult }: { mode: 'password' | 'mfa' | 'oauth'; onResult: (value: string) => void }) {
  const session = useSession();
  if (session.booting) return <Text>booting</Text>;
  return (
    <Pressable
      onPress={async () => {
        try {
          if (mode === 'password') {
            await session.signIn('person@example.com', 'secret');
          } else if (mode === 'mfa') {
            await session.completeMfaSignIn('challenge-id', '123456');
          } else {
            await session.signInWithOAuth('github');
          }
          onResult('resolved');
        } catch (error) {
          onResult(error instanceof Error ? error.message : 'rejected');
        }
      }}
    >
      <Text>{mode}</Text>
    </Pressable>
  );
}

function SignOutProbe({ onResult }: { onResult: (value: string) => void }) {
  const session = useSession();
  if (session.booting) return <Text>booting</Text>;
  return (
    <>
      <Text>{session.authenticated ? 'authenticated' : 'signed-out'}</Text>
      <Pressable
        onPress={async () => {
          try {
            await session.signOut();
            onResult('resolved');
          } catch (error) {
            onResult(error instanceof Error ? error.message : 'rejected');
          }
        }}
      >
        <Text>sign-out</Text>
      </Pressable>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCachedUser.mockResolvedValue(null);
  mockGetAccessToken.mockResolvedValue(null);
  mockGetSessionEpoch.mockReturnValue(0);
  mockSaveAuthToken.mockResolvedValue(undefined);
  mockSaveCurrentUser.mockResolvedValue(undefined);
  mockClearStoredSession.mockResolvedValue(undefined);
  mockAuthService.login.mockResolvedValue(token);
  mockAuthService.signInWithOAuth.mockResolvedValue(token);
  mockAuthService.verifyLoginMfa.mockResolvedValue(token);
  mockProfileService.me.mockRejectedValue(new Error('Profile API down'));
});

describe('SessionProvider auth completion failures', () => {
  it('clears a just-saved password login session when profile refresh fails', async () => {
    const onResult = jest.fn();
    const { getByText } = render(
      <SessionProvider>
        <SignInProbe mode="password" onResult={onResult} />
      </SessionProvider>,
    );

    await waitFor(() => expect(getByText('password')).toBeTruthy());
    fireEvent.press(getByText('password'));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith('Profile API down'));
    expect(mockSaveAuthToken).toHaveBeenCalledWith(token);
    expect(mockClearStoredSession).toHaveBeenCalledTimes(1);
  });

  it('clears an MFA login session when profile refresh fails', async () => {
    const onResult = jest.fn();
    const { getByText } = render(
      <SessionProvider>
        <SignInProbe mode="mfa" onResult={onResult} />
      </SessionProvider>,
    );

    await waitFor(() => expect(getByText('mfa')).toBeTruthy());
    fireEvent.press(getByText('mfa'));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith('Profile API down'));
    expect(mockAuthService.verifyLoginMfa).toHaveBeenCalledWith('challenge-id', '123456');
    expect(mockClearStoredSession).toHaveBeenCalledTimes(1);
  });

  it('clears an OAuth login session when profile refresh fails', async () => {
    const onResult = jest.fn();
    const { getByText } = render(
      <SessionProvider>
        <SignInProbe mode="oauth" onResult={onResult} />
      </SessionProvider>,
    );

    await waitFor(() => expect(getByText('oauth')).toBeTruthy());
    fireEvent.press(getByText('oauth'));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith('Profile API down'));
    expect(mockAuthService.signInWithOAuth).toHaveBeenCalledWith('github');
    expect(mockClearStoredSession).toHaveBeenCalledTimes(1);
  });
});

describe('SessionProvider signOut failures', () => {
  it('keeps the current user when local logout clear fails', async () => {
    const onResult = jest.fn();
    mockGetCachedUser.mockResolvedValue(currentUser);
    mockGetAccessToken.mockResolvedValue('access');
    mockProfileService.me.mockResolvedValue(currentUser);
    mockAuthService.logout.mockRejectedValueOnce(new Error('secure delete failed'));
    const { getByText } = render(
      <SessionProvider>
        <SignOutProbe onResult={onResult} />
      </SessionProvider>,
    );

    await waitFor(() => expect(getByText('authenticated')).toBeTruthy());
    fireEvent.press(getByText('sign-out'));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith('secure delete failed'));
    expect(getByText('authenticated')).toBeTruthy();
  });

  it('clears the current user after local logout succeeds', async () => {
    const onResult = jest.fn();
    mockGetCachedUser.mockResolvedValue(currentUser);
    mockGetAccessToken.mockResolvedValue('access');
    mockProfileService.me.mockResolvedValue(currentUser);
    mockAuthService.logout.mockResolvedValueOnce(undefined);
    const { getByText } = render(
      <SessionProvider>
        <SignOutProbe onResult={onResult} />
      </SessionProvider>,
    );

    await waitFor(() => expect(getByText('authenticated')).toBeTruthy());
    fireEvent.press(getByText('sign-out'));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith('resolved'));
    await waitFor(() => expect(getByText('signed-out')).toBeTruthy());
  });
});
