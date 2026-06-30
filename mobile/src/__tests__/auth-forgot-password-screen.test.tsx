/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AuthForgotPasswordScreen } from '../components/auth/auth-forgot-password-screen';
import { authService } from '../api/services';

const mockRouterReplace = jest.fn();
const mockClearSession = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  },
}));

jest.mock('../api/services', () => ({
  authService: {
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
    resetPassword: jest.fn(),
    checkPasswordBreach: jest.fn(),
  },
}));

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({
    clearSession: mockClearSession,
  }),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

const mockAuthService = authService as jest.Mocked<typeof authService>;

beforeEach(() => {
  jest.clearAllMocks();
  mockClearSession.mockResolvedValue(undefined);
  mockAuthService.requestOtp.mockResolvedValue({ data: { delivery: 'email', expires_in_seconds: 300 } } as never);
  mockAuthService.verifyOtp.mockResolvedValue({ email: 'tri@example.com', next_step: 'reset_password' } as never);
  mockAuthService.checkPasswordBreach.mockResolvedValue({ breached: false, count: 0 });
  mockAuthService.resetPassword.mockResolvedValue({
    access_token: 'new-token',
    refresh_token: 'refresh-token',
    token_type: 'bearer',
    user_id: 'user-1',
    email: 'tri@example.com',
    username: null,
    display_name: 'Tri',
    avatar_url: null,
    onboarding_status: 'complete',
  } as never);
});

describe('AuthForgotPasswordScreen', () => {
  it('uses reset-code copy instead of reset-link copy', () => {
    const { getByText, queryByText } = render(<AuthForgotPasswordScreen />);

    expect(getByText('Enter your email to receive a reset code')).toBeTruthy();
    expect(queryByText(/reset link/i)).toBeNull();
  });

  it('resets a public password without storing the returned token and routes to sign-in', async () => {
    const { getByLabelText, getByText } = render(<AuthForgotPasswordScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'tri@example.com');
    fireEvent.press(getByText('Send reset code'));

    await waitFor(() => expect(mockAuthService.requestOtp).toHaveBeenCalledWith({
      email: 'tri@example.com',
      purpose: 'reset_password',
    }));

    fireEvent.changeText(getByLabelText('OTP code'), '123456');
    fireEvent.press(getByText('Verify code'));

    await waitFor(() => expect(mockAuthService.verifyOtp).toHaveBeenCalledWith({
      email: 'tri@example.com',
      purpose: 'reset_password',
      code: '123456',
    }));

    fireEvent.changeText(getByLabelText('New password'), 'Newpass1!');
    fireEvent.changeText(getByLabelText('Confirm new password'), 'Newpass1!');
    fireEvent.press(getByLabelText('Reset password'));

    await waitFor(() => {
      expect(mockAuthService.checkPasswordBreach).toHaveBeenCalledWith('Newpass1!');
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'tri@example.com',
        'Newpass1!',
        { persistToken: false },
      );
      expect(mockClearSession).toHaveBeenCalledTimes(1);
      expect(mockRouterReplace).toHaveBeenCalledWith('/auth/sign-in');
    });
  });

  it('requires matching confirmation before reset submit', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AuthForgotPasswordScreen />);

    fireEvent.changeText(getByLabelText('Email'), 'tri@example.com');
    fireEvent.press(getByText('Send reset code'));
    await waitFor(() => expect(getByText('Reset code sent to tri@example.com. Check your inbox.')).toBeTruthy());
    fireEvent.changeText(getByLabelText('OTP code'), '123456');
    fireEvent.press(getByText('Verify code'));
    await waitFor(() => expect(getByText('Set a new password for your account.')).toBeTruthy());

    fireEvent.changeText(getByLabelText('New password'), 'Newpass1!');
    fireEvent.changeText(getByLabelText('Confirm new password'), 'Mismatch1!');
    fireEvent.press(getByLabelText('Reset password'));

    expect(getAllByText('Passwords do not match.').length).toBeGreaterThan(0);
    expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
  });
});
