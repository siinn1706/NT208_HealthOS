/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SecurityScreen } from '../components/profile/security-screen';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { authService } from '../api/services/auth-service';

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
  mockUseApiQuery.mockImplementation((key: string) => {
    if (key === queryKeys.mfaStatus) return queryState({ enabled: true }) as never;
    if (key === queryKeys.securityLogs) {
      return queryState([{ id: 'log-1', event_type: 'mfa_enabled', created_at: '2026-05-20T10:00:00.000Z' }]) as never;
    }
    return queryState(null) as never;
  });
});

describe('SecurityScreen', () => {
  it('renders MFA state and security log entries', () => {
    const { getByText } = render(<SecurityScreen />);
    expect(getByText('MFA is active')).toBeTruthy();
    expect(getByText(/mfa enabled/i)).toBeTruthy();
  });

  it('shows unavailable feedback instead of locally toggling Face ID', () => {
    const { getByText } = render(<SecurityScreen />);

    fireEvent.press(getByText('Face ID'));

    expect(getByText(/Face ID is not available/i)).toBeTruthy();
  });

  it('does not present unsupported app lock as enabled', () => {
    const { getByText, getAllByText } = render(<SecurityScreen />);

    expect(getAllByText('Unavailable').length).toBeGreaterThanOrEqual(1);
    expect(() => getByText('On')).toThrow();

    fireEvent.press(getByText('App lock'));

    expect(getByText(/Native app lock settings are not backed/i)).toBeTruthy();
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
