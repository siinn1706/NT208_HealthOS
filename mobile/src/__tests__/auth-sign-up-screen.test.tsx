/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AuthSignUpScreen } from '../components/auth/auth-sign-up-screen';
import { authService } from '../api/services';
import { ApiError } from '../api/client';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('../api/services', () => ({
  authService: {
    requestOtp: jest.fn(),
  },
}));

jest.mock('../auth/pending-signup', () => ({
  setPendingSignup: jest.fn(),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

const mockRequestOtp = authService.requestOtp as jest.MockedFunction<typeof authService.requestOtp>;
const mockRouterPush = router.push as jest.MockedFunction<typeof router.push>;

describe('AuthSignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render Cloudflare origin text when OTP request fails upstream', async () => {
    const cloudflareMessage = 'The origin web server returned an invalid or incomplete response to Cloudflare.';
    mockRequestOtp.mockRejectedValueOnce(new ApiError(cloudflareMessage, 520, 'REQUEST_FAILED'));

    const { getByLabelText, getByText, queryByText } = render(<AuthSignUpScreen />);
    fireEvent.changeText(getByLabelText('Full name'), 'Tri Hoang');
    fireEvent.changeText(getByLabelText('Email'), 'tri@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password1');
    fireEvent.press(getByLabelText('Agree to terms and privacy policy'));
    fireEvent.press(getByText('Continue'));

    await waitFor(() => expect(mockRequestOtp).toHaveBeenCalledWith({
      email: 'tri@example.com',
      purpose: 'signup',
      name: 'Tri Hoang',
      username: 'tri',
      password: 'password1',
    }));
    await waitFor(() => {
      expect(queryByText(cloudflareMessage)).toBeNull();
      expect(getByText('An unexpected server error occurred.')).toBeTruthy();
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
