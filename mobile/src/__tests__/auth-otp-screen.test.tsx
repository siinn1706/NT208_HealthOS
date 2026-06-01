/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AuthOtpScreen } from '../components/auth/auth-otp-screen';
import { authService } from '../api/services';

const mockRouterReplace = jest.fn();
const mockRefreshUser = jest.fn();
const mockClearSession = jest.fn();
let mockParams: { email?: string; purpose?: string } = {};

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../api/services', () => ({
  authService: {
    verifyOtp: jest.fn(),
    requestOtp: jest.fn(),
  },
}));

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({
    refreshUser: mockRefreshUser,
    clearSession: mockClearSession,
  }),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

const mockAuthService = authService as jest.Mocked<typeof authService>;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { email: 'person@example.com', purpose: 'signup' };
  mockRefreshUser.mockResolvedValue({ id: 'user-1', email: 'person@example.com' });
  mockClearSession.mockResolvedValue(undefined);
  mockAuthService.verifyOtp.mockResolvedValue({
    access_token: 'access',
    token_type: 'bearer',
    refresh_token: 'refresh',
    user_id: 'user-1',
    email: 'person@example.com',
    username: null,
    display_name: 'Person',
    avatar_url: null,
    onboarding_status: 'new',
  });
});

describe('AuthOtpScreen', () => {
  it('routes signup verification to authenticated onboarding setup', async () => {
    const { getByText, UNSAFE_getAllByType } = render(<AuthOtpScreen />);
    const inputs = UNSAFE_getAllByType('TextInput' as never);

    ['1', '2', '3', '4', '5', '6'].forEach((digit, index) => {
      fireEvent.changeText(inputs[index], digit);
    });
    fireEvent.press(getByText('Verify'));

    await waitFor(() => {
      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith({
        email: 'person@example.com',
        password: undefined,
        purpose: 'signup',
        code: '123456',
      });
      expect(mockRefreshUser).toHaveBeenCalledWith({ throwOnFailure: true });
      expect(mockRouterReplace).toHaveBeenCalledWith('/onboarding/setup');
    });
  });

  it('clears the stored OTP session when profile refresh fails', async () => {
    mockRefreshUser.mockRejectedValueOnce(new Error('Profile API down'));
    const { getByText, UNSAFE_getAllByType } = render(<AuthOtpScreen />);
    const inputs = UNSAFE_getAllByType('TextInput' as never);

    ['1', '2', '3', '4', '5', '6'].forEach((digit, index) => {
      fireEvent.changeText(inputs[index], digit);
    });
    fireEvent.press(getByText('Verify'));

    await waitFor(() => {
      expect(mockClearSession).toHaveBeenCalledTimes(1);
      expect(getByText('Profile API down')).toBeTruthy();
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });
  });
});
