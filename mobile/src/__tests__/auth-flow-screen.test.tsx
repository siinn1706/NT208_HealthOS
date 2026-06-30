/* eslint-env jest */
import React from 'react';
import { Text as MockText } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AuthFlowScreen } from '../components/auth/auth-flow-screen';
import { AUTH_WELCOME_ROUTE } from '../auth/auth-route-policy';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('../components/auth/auth-welcome-screen', () => ({
  AuthWelcomeScreen: () => <MockText>Welcome</MockText>,
}));

jest.mock('../components/auth/auth-sign-in-screen', () => ({
  AuthSignInScreen: () => <MockText>Sign in</MockText>,
}));

jest.mock('../components/auth/auth-sign-up-screen', () => ({
  AuthSignUpScreen: () => <MockText>Sign up</MockText>,
}));

jest.mock('../components/auth/auth-otp-screen', () => ({
  AuthOtpScreen: () => <MockText>OTP</MockText>,
}));

jest.mock('../components/auth/auth-setup-screen', () => ({
  AuthSetupScreen: () => <MockText>Setup</MockText>,
}));

jest.mock('../components/auth/auth-forgot-password-screen', () => ({
  AuthForgotPasswordScreen: () => <MockText>Forgot</MockText>,
}));

jest.mock('../components/auth/permissions-screen', () => ({
  PermissionsScreen: () => <MockText>Permissions</MockText>,
}));

jest.mock('../components/auth/auth-mfa-screen', () => ({
  AuthMfaScreen: () => <MockText>MFA</MockText>,
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

const mockRouterBack = router.back as jest.MockedFunction<typeof router.back>;
const mockRouterCanGoBack = router.canGoBack as jest.MockedFunction<typeof router.canGoBack>;
const mockRouterReplace = router.replace as jest.MockedFunction<typeof router.replace>;

describe('AuthFlowScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterCanGoBack.mockReturnValue(true);
  });

  it('uses history when the auth back button has a previous route', () => {
    const { getByLabelText } = render(<AuthFlowScreen kind="sign-in" />);

    fireEvent.press(getByLabelText('Back'));

    expect(mockRouterCanGoBack).toHaveBeenCalledWith();
    expect(mockRouterBack).toHaveBeenCalledWith();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('falls back to the auth welcome route when the auth back button has no history', () => {
    mockRouterCanGoBack.mockReturnValue(false);
    const { getByLabelText } = render(<AuthFlowScreen kind="sign-in" />);

    fireEvent.press(getByLabelText('Back'));

    expect(mockRouterCanGoBack).toHaveBeenCalledWith();
    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(mockRouterReplace).toHaveBeenCalledWith(AUTH_WELCOME_ROUTE as never);
  });
});
