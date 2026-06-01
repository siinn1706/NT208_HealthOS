/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SecurityScreen } from '../components/profile/security-screen';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { authService } from '../api/services/auth-service';
import {
  authenticateAppLock,
  getAppLockAvailability,
  isAppLockEnabled,
  setAppLockEnabled,
} from '../auth/app-lock-service';

const mockRouterPush = jest.fn();
const mockRefreshUser = jest.fn();

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({ user: { email: 'test@example.com' }, refreshUser: mockRefreshUser }),
}));

jest.mock('../api/services/auth-service', () => ({
  authService: {
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

jest.mock('../auth/app-lock-service', () => ({
  appLockUnavailableMessage: (reason?: string) => (
    reason === 'not_enrolled'
      ? 'Set up fingerprint or face unlock in Android settings before enabling app lock.'
      : 'Native local authentication is unavailable in this build.'
  ),
  authenticateAppLock: jest.fn(),
  getAppLockAvailability: jest.fn(),
  isAppLockEnabled: jest.fn(),
  setAppLockEnabled: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    push: mockRouterPush,
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockAuthenticateAppLock = authenticateAppLock as jest.MockedFunction<typeof authenticateAppLock>;
const mockGetAppLockAvailability = getAppLockAvailability as jest.MockedFunction<typeof getAppLockAvailability>;
const mockIsAppLockEnabled = isAppLockEnabled as jest.MockedFunction<typeof isAppLockEnabled>;
const mockSetAppLockEnabled = setAppLockEnabled as jest.MockedFunction<typeof setAppLockEnabled>;

function queryState(data: unknown) {
  return {
    data,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: Array.isArray(data) ? data.length === 0 : false,
    reload: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRefreshUser.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
  mockAuthService.requestOtp.mockResolvedValue({ data: { email: 'test@example.com' } } as never);
  mockAuthService.verifyOtp.mockResolvedValue({ next_step: 'reset_password' } as never);
  mockAuthService.resetPassword.mockResolvedValue({ access_token: 'new-token', refresh_token: 'refresh-token', token_type: 'bearer' } as never);
  mockIsAppLockEnabled.mockResolvedValue(false);
  mockGetAppLockAvailability.mockResolvedValue({
    available: true,
    methods: ['Fingerprint'],
    securityLevel: 'Strong biometric',
  });
  mockAuthenticateAppLock.mockResolvedValue(true);
  mockSetAppLockEnabled.mockResolvedValue(undefined);
  mockUseApiQuery.mockImplementation((key: string) => {
    if (key === queryKeys.mfaStatus) return queryState({ enabled: true }) as never;
    if (key === queryKeys.securityLogs) {
      return queryState([{ id: 'log-1', event_type: 'mfa_enabled', created_at: '2026-05-20T10:00:00.000Z' }]) as never;
    }
    return queryState(null) as never;
  });
});

describe('SecurityScreen', () => {
  it('renders MFA state and security log entries', async () => {
    const { getByText } = render(<SecurityScreen />);
    expect(getByText('MFA is active')).toBeTruthy();
    expect(getByText(/mfa enabled/i)).toBeTruthy();
    await waitFor(() => expect(getByText('App lock')).toBeTruthy());
  });

  it('does not render security rows that only report unavailable native actions', async () => {
    const { getByText, queryByText } = render(<SecurityScreen />);

    await waitFor(() => expect(getByText('Recovery codes')).toBeTruthy());

    expect(queryByText('Active sessions')).toBeNull();
    expect(queryByText('Recovery email')).toBeNull();
    expect(queryByText('Recovery phone')).toBeNull();
    expect(queryByText(/not available in the native app yet/i)).toBeNull();
  });

  it('enables native app lock after local authentication', async () => {
    const { getByText } = render(<SecurityScreen />);

    await waitFor(() => expect(getByText('App lock')).toBeTruthy());
    fireEvent.press(getByText('Enable app lock'));

    await waitFor(() => expect(mockAuthenticateAppLock).toHaveBeenCalledWith('Enable HealthOS app lock'));
    expect(mockSetAppLockEnabled).toHaveBeenCalledWith(true);
    expect(getByText(/App lock enabled/i)).toBeTruthy();
  });

  it('does not enable app lock when local auth is unavailable', async () => {
    mockGetAppLockAvailability.mockResolvedValue({
      available: false,
      reason: 'not_enrolled',
      methods: ['Fingerprint'],
      securityLevel: 'None',
    });
    const { getByText, queryByText } = render(<SecurityScreen />);

    await waitFor(() => expect(getByText('UNAVAILABLE')).toBeTruthy());
    expect(queryByText('Enable app lock')).toBeTruthy();

    expect(mockAuthenticateAppLock).not.toHaveBeenCalled();
  });

  it('disables app lock after local authentication', async () => {
    mockIsAppLockEnabled.mockResolvedValue(true);
    const { getByText } = render(<SecurityScreen />);

    await waitFor(() => expect(getByText('Disable app lock')).toBeTruthy());
    fireEvent.press(getByText('Disable app lock'));

    await waitFor(() => expect(mockAuthenticateAppLock).toHaveBeenCalledWith('Disable HealthOS app lock'));
    expect(mockSetAppLockEnabled).toHaveBeenCalledWith(false);
    expect(getByText('App lock disabled.')).toBeTruthy();
  });

  it('keeps app lock enabled when disable authentication is cancelled', async () => {
    mockIsAppLockEnabled.mockResolvedValue(true);
    mockAuthenticateAppLock.mockResolvedValue(false);
    const { getByText } = render(<SecurityScreen />);

    await waitFor(() => expect(getByText('Disable app lock')).toBeTruthy());
    fireEvent.press(getByText('Disable app lock'));

    await waitFor(() => expect(mockAuthenticateAppLock).toHaveBeenCalledWith('Disable HealthOS app lock'));
    expect(mockSetAppLockEnabled).not.toHaveBeenCalledWith(false);
    expect(getByText(/App lock remains enabled/i)).toBeTruthy();
  });

  it('resets password with the native email OTP flow', async () => {
    const { getByText, getByPlaceholderText } = render(<SecurityScreen />);

    fireEvent.press(getByText('Password'));
    fireEvent.press(getByText('Send reset code'));

    await waitFor(() => {
      expect(mockAuthService.requestOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        purpose: 'reset_password',
      });
    });

    fireEvent.changeText(getByPlaceholderText('000000'), '123456');
    fireEvent.changeText(getByPlaceholderText('Min 8 characters'), 'Newpass123');
    fireEvent.changeText(getByPlaceholderText('Repeat new password'), 'Newpass123');
    fireEvent.press(getByText('Reset password'));

    await waitFor(() => {
      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        purpose: 'reset_password',
        code: '123456',
      });
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith('test@example.com', 'Newpass123');
      expect(mockRefreshUser).toHaveBeenCalled();
    });
    expect(mockRouterPush).not.toHaveBeenCalledWith('/auth/forgot');
  });
});
