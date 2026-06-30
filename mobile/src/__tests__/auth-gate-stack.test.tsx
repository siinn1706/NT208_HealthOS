import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthGateStack } from '../../app/_layout';
import { useSession } from '../auth/session-provider';
import { getAuthGateRedirect } from '../auth/auth-route-policy';
import * as SplashScreen from 'expo-splash-screen';
import { Text } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockUseSegments = jest.fn();
const mockRedirect = jest.fn(({ href }: { href: string }) => <Text testID="auth-redirect">{href}</Text>);
const mockStack = jest.fn(() => <Text testID="auth-stack">app-stack</Text>);

jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => mockRedirect(props),
  Stack: () => mockStack(),
  useSegments: () => mockUseSegments(),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('../auth/session-provider', () => ({
  useSession: jest.fn(),
}));

jest.mock('../theme/useTheme', () => ({
  useTheme: () => ({
    bg: '#111827',
    ink: '#E5E7EB',
    brand: '#38BDF8',
  }),
}));

jest.mock('../auth/auth-route-policy', () => ({
  getAuthGateRedirect: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockGetAuthGateRedirect = getAuthGateRedirect as jest.MockedFunction<typeof getAuthGateRedirect>;

describe('AuthGateStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSegments.mockReturnValue([]);
    mockGetAuthGateRedirect.mockReturnValue(null);
  });

  it('renders a minimal loading state while session is booting', () => {
    mockUseSession.mockReturnValue({
      authenticated: false,
      booting: true,
      error: null,
      signIn: jest.fn(),
      signInWithOAuth: jest.fn(),
      completeMfaSignIn: jest.fn(),
      signOut: jest.fn(),
      refreshUser: jest.fn(),
      updateProfile: jest.fn(),
      clearSession: jest.fn(),
      user: null,
    });

    const { getByText, queryByTestId } = render(<AuthGateStack fontsLoaded />);

    expect(getByText(/Starting HealthOS/)).toBeTruthy();
    expect(queryByTestId('auth-stack')).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it('hides the splash screen only after booting completes', async () => {
    mockUseSession.mockReturnValue({
      authenticated: false,
      booting: false,
      error: null,
      signIn: jest.fn(),
      signInWithOAuth: jest.fn(),
      completeMfaSignIn: jest.fn(),
      signOut: jest.fn(),
      refreshUser: jest.fn(),
      updateProfile: jest.fn(),
      clearSession: jest.fn(),
      user: null,
    });
    mockGetAuthGateRedirect.mockReturnValue('/auth/welcome');

    const { findByTestId } = render(<AuthGateStack fontsLoaded />);
    await findByTestId('auth-redirect');
    await findByTestId('auth-stack');

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: '/auth/welcome' }),
    );
    expect(mockStack).toHaveBeenCalledTimes(1);
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    expect(SplashScreen.hideAsync).toHaveBeenCalledWith();
  });
});
