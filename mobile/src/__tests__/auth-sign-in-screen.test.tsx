/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AuthSignInScreen } from '../components/auth/auth-sign-in-screen';
import { useSession } from '../auth/session-provider';
import type { CurrentUser } from '../types/api';
import { ApiError } from '../api/client';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../auth/session-provider', () => ({
  useSession: jest.fn(),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockRouterReplace = router.replace as jest.MockedFunction<typeof router.replace>;

const completedUser: CurrentUser = {
  id: 'user-1',
  email: 'done@example.com',
  username: null,
  display_name: 'Done User',
  avatar_url: null,
  onboarding_status: 'completed',
  onboarding_completed_at: '2026-06-01T00:00:00Z',
};

const pendingUser: CurrentUser = {
  ...completedUser,
  id: 'user-2',
  email: 'new@example.com',
  onboarding_status: 'pending',
  onboarding_completed_at: null,
};

function mockSession(overrides: Partial<ReturnType<typeof useSession>> = {}) {
  mockUseSession.mockReturnValue({
    user: null,
    booting: false,
    authenticated: false,
    error: null,
    signIn: jest.fn(),
    signInWithOAuth: jest.fn(),
    completeMfaSignIn: jest.fn(),
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    updateProfile: jest.fn(),
    clearSession: jest.fn(),
    ...overrides,
  });
}

describe('AuthSignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes new OAuth users to onboarding setup', async () => {
    const signInWithOAuth = jest.fn().mockResolvedValue(pendingUser);
    mockSession({ signInWithOAuth });

    const { getByLabelText } = render(<AuthSignInScreen />);
    fireEvent.press(getByLabelText('auth.continueWithGitHub'));

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith('github'));
    expect(mockRouterReplace).toHaveBeenCalledWith('/onboarding/setup' as never);
  });

  it('routes completed OAuth users to home', async () => {
    const signInWithOAuth = jest.fn().mockResolvedValue(completedUser);
    mockSession({ signInWithOAuth });

    const { getByLabelText } = render(<AuthSignInScreen />);
    fireEvent.press(getByLabelText('auth.continueWithGoogle'));

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith('google'));
    expect(mockRouterReplace).toHaveBeenCalledWith('/home' as never);
  });

  it('maps INVALID_CREDENTIALS to a localized error', async () => {
    const signIn = jest.fn().mockRejectedValue(new ApiError('Tên đăng nhập hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS'));
    mockSession({ signIn });

    const { getByLabelText, getByText } = render(<AuthSignInScreen />);
    fireEvent.changeText(getByLabelText('auth.email'), 'bad@example.com');
    fireEvent.changeText(getByLabelText('auth.password'), 'wrong');
    fireEvent.press(getByText('auth.signIn'));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('bad@example.com', 'wrong'));
    expect(getByText('auth.invalidCredentials')).toBeTruthy();
  });

  it('maps ACCOUNT_BANNED to a localized error', async () => {
    const signIn = jest.fn().mockRejectedValue(new ApiError('Your account has been banned.', 403, 'ACCOUNT_BANNED'));
    mockSession({ signIn });

    const { getByLabelText, getByText } = render(<AuthSignInScreen />);
    fireEvent.changeText(getByLabelText('auth.email'), 'banned@example.com');
    fireEvent.changeText(getByLabelText('auth.password'), 'wrong');
    fireEvent.press(getByText('auth.signIn'));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('banned@example.com', 'wrong'));
    expect(getByText('auth.accountBanned')).toBeTruthy();
  });
});
