/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AuthMfaScreen } from '../components/auth/auth-mfa-screen';

const mockRouterReplace = jest.fn();
const mockCompleteMfaSignIn = jest.fn();
let mockParams: { challenge_id?: string; expires_in_seconds?: string } = {};

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({
    completeMfaSignIn: mockCompleteMfaSignIn,
  }),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

describe('AuthMfaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { challenge_id: 'challenge-1' };
    mockCompleteMfaSignIn.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      onboarding_status: 'completed',
    });
  });

  it('lets AuthGate route after MFA completes and refreshes the session user', async () => {
    const { getByLabelText, getByText } = render(<AuthMfaScreen />);

    fireEvent.changeText(getByLabelText('Verification code'), '123456');
    fireEvent.press(getByText('Verify and continue'));

    await waitFor(() => {
      expect(mockCompleteMfaSignIn).toHaveBeenCalledWith('challenge-1', '123456');
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });
  });
});
