/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AuthSignUpScreen } from '../components/auth/auth-sign-up-screen';
import { authService } from '../api/services';
import { ApiError } from '../api/client';
import { setPendingSignup } from '../auth/pending-signup';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('../api/services', () => ({
  authService: {
    requestOtp: jest.fn(),
    checkEmailAvailability: jest.fn(),
    checkUsernameAvailability: jest.fn(),
    checkPasswordBreach: jest.fn(),
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
const mockCheckEmailAvailability = authService.checkEmailAvailability as jest.MockedFunction<typeof authService.checkEmailAvailability>;
const mockCheckUsernameAvailability = authService.checkUsernameAvailability as jest.MockedFunction<typeof authService.checkUsernameAvailability>;
const mockCheckPasswordBreach = authService.checkPasswordBreach as jest.MockedFunction<typeof authService.checkPasswordBreach>;
const mockRouterPush = router.push as jest.MockedFunction<typeof router.push>;
const mockSetPendingSignup = setPendingSignup as jest.MockedFunction<typeof setPendingSignup>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

describe('AuthSignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckEmailAvailability.mockResolvedValue(true);
    mockCheckUsernameAvailability.mockResolvedValue(true);
    mockCheckPasswordBreach.mockResolvedValue({ breached: false, count: 0 });
    mockRequestOtp.mockResolvedValue({ data: { delivery: 'email', expires_in_seconds: 300 } } as never);
  });

  it('submits the web-shaped signup OTP payload without profile name or terms fields', async () => {
    const { getByLabelText, getByText, queryByLabelText } = render(<AuthSignUpScreen />);

    expect(queryByLabelText('Full name')).toBeNull();
    expect(queryByLabelText('Agree to terms and privacy policy')).toBeNull();

    fireEvent.changeText(getByLabelText('Username'), 'tri_user');
    fireEvent.changeText(getByLabelText('Email'), 'tri@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'Str0ng!pass');
    fireEvent.changeText(getByLabelText('Confirm password'), 'Str0ng!pass');
    fireEvent.press(getByText('Continue'));

    await waitFor(() => expect(mockRequestOtp).toHaveBeenCalledWith({
      email: 'tri@example.com',
      purpose: 'signup',
      username: 'tri_user',
      password: 'Str0ng!pass',
    }));
    expect(mockCheckEmailAvailability).toHaveBeenCalledWith('tri@example.com');
    expect(mockCheckUsernameAvailability).toHaveBeenCalledWith('tri_user');
    expect(mockCheckPasswordBreach).toHaveBeenCalledWith('Str0ng!pass');
    expect(mockSetPendingSignup).toHaveBeenCalledWith({
      email: 'tri@example.com',
      username: 'tri_user',
    });
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/auth/otp',
      params: { email: 'tri@example.com', purpose: 'signup' },
    });
  });

  it('blocks weak passwords before requesting signup OTP', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AuthSignUpScreen />);

    fireEvent.changeText(getByLabelText('Username'), 'tri_user');
    fireEvent.changeText(getByLabelText('Email'), 'tri@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password1');
    fireEvent.changeText(getByLabelText('Confirm password'), 'password1');
    fireEvent.press(getByText('Continue'));

    expect(getAllByText('Use 8+ characters with uppercase, lowercase, number, and symbol.').length).toBeGreaterThan(0);
    expect(mockRequestOtp).not.toHaveBeenCalled();
  });

  it('blocks taken username and email states before requesting signup OTP', async () => {
    mockCheckUsernameAvailability.mockResolvedValueOnce(false);

    const { getByLabelText, getByText } = render(<AuthSignUpScreen />);
    fireEvent.changeText(getByLabelText('Username'), 'taken_user');
    fireEvent.changeText(getByLabelText('Email'), 'tri@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'Str0ng!pass');
    fireEvent.changeText(getByLabelText('Confirm password'), 'Str0ng!pass');
    fireEvent.press(getByText('Continue'));

    await waitFor(() => expect(getByText('This username is already taken.')).toBeTruthy());
    expect(mockRequestOtp).not.toHaveBeenCalled();
  });

  it('ignores stale availability responses for a previous username value', async () => {
    const firstUsernameCheck = deferred<boolean>();
    mockCheckUsernameAvailability
      .mockReturnValueOnce(firstUsernameCheck.promise)
      .mockResolvedValue(true);

    const { getByLabelText, queryByText } = render(<AuthSignUpScreen />);
    const usernameInput = getByLabelText('Username');

    fireEvent.changeText(usernameInput, 'taken_user');
    fireEvent(usernameInput, 'blur');
    await waitFor(() => expect(mockCheckUsernameAvailability).toHaveBeenCalledWith('taken_user'));

    fireEvent.changeText(usernameInput, 'fresh_user');
    firstUsernameCheck.resolve(false);

    await waitFor(() => {
      expect(queryByText('This username is already taken.')).toBeNull();
    });
  });

  it('does not render Cloudflare origin text when OTP request fails upstream', async () => {
    const cloudflareMessage = 'The origin web server returned an invalid or incomplete response to Cloudflare.';
    mockRequestOtp.mockRejectedValueOnce(new ApiError(cloudflareMessage, 520, 'REQUEST_FAILED'));

    const { getByLabelText, getByText, queryByText } = render(<AuthSignUpScreen />);
    fireEvent.changeText(getByLabelText('Username'), 'tri_user');
    fireEvent.changeText(getByLabelText('Email'), 'tri@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'Str0ng!pass');
    fireEvent.changeText(getByLabelText('Confirm password'), 'Str0ng!pass');
    fireEvent.press(getByText('Continue'));

    await waitFor(() => expect(mockRequestOtp).toHaveBeenCalledWith({
      email: 'tri@example.com',
      purpose: 'signup',
      username: 'tri_user',
      password: 'Str0ng!pass',
    }));
    await waitFor(() => {
      expect(queryByText(cloudflareMessage)).toBeNull();
      expect(getByText('An unexpected server error occurred.')).toBeTruthy();
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
