/* eslint-env jest */
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppState, Text, type AppStateStatus } from 'react-native';
import { AppLockProvider } from '../auth/app-lock-provider';
import {
  authenticateAppLock,
  getAppLockAvailability,
  isAppLockEnabled,
  setAppLockEnabled,
  subscribeAppLockEnabled,
} from '../auth/app-lock-service';

const mockSignOut = jest.fn();

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({
    authenticated: true,
    booting: false,
    signOut: mockSignOut,
  }),
}));

jest.mock('../auth/app-lock-service', () => ({
  authenticateAppLock: jest.fn(),
  getAppLockAvailability: jest.fn(),
  isAppLockEnabled: jest.fn(),
  setAppLockEnabled: jest.fn(),
  subscribeAppLockEnabled: jest.fn(() => jest.fn()),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockAuthenticate = authenticateAppLock as jest.MockedFunction<typeof authenticateAppLock>;
const mockGetAvailability = getAppLockAvailability as jest.MockedFunction<typeof getAppLockAvailability>;
const mockIsEnabled = isAppLockEnabled as jest.MockedFunction<typeof isAppLockEnabled>;
const mockSetEnabled = setAppLockEnabled as jest.MockedFunction<typeof setAppLockEnabled>;
const mockSubscribe = subscribeAppLockEnabled as jest.MockedFunction<typeof subscribeAppLockEnabled>;
let appStateListener: ((state: AppStateStatus) => void) | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  mockIsEnabled.mockResolvedValue(true);
  mockGetAvailability.mockResolvedValue({
    available: true,
    methods: ['Fingerprint'],
    securityLevel: 'Strong biometric',
  });
  mockAuthenticate.mockResolvedValue(true);
  mockSetEnabled.mockResolvedValue(undefined);
  mockSubscribe.mockReturnValue(jest.fn());
  appStateListener = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appStateListener = listener;
    return { remove: jest.fn() } as never;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function moveAppToBackgroundAndForeground() {
  await act(async () => {
    appStateListener?.('background');
  });
  await act(async () => {
    appStateListener?.('active');
  });
}

describe('AppLockProvider', () => {
  it('unlocks authenticated sessions after successful local auth', async () => {
    const { getByText } = render(
      <AppLockProvider>
        <Text>protected content</Text>
      </AppLockProvider>,
    );

    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalled());
    await waitFor(() => expect(getByText('protected content')).toBeTruthy());
  });

  it('keeps protected content hidden when unlock is cancelled and allows sign out', async () => {
    mockAuthenticate.mockResolvedValueOnce(false);
    let resolveSignOut: (() => void) | null = null;
    mockSignOut.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveSignOut = resolve;
    }));

    const { getByText, queryByText } = render(
      <AppLockProvider>
        <Text>protected content</Text>
      </AppLockProvider>,
    );

    await waitFor(() => expect(getByText('HealthOS is locked')).toBeTruthy());
    expect(queryByText('protected content')).toBeNull();
    await act(async () => {
      fireEvent.press(getByText('Sign out'));
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSignOut?.();
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it('shows a sign-out error when local logout clear fails', async () => {
    mockAuthenticate.mockResolvedValueOnce(false);
    let rejectSignOut: ((error: Error) => void) | null = null;
    mockSignOut.mockImplementationOnce(() => new Promise((_resolve, reject) => {
      rejectSignOut = reject;
    }));

    const { findByText, getByText, queryByText } = render(
      <AppLockProvider>
        <Text>protected content</Text>
      </AppLockProvider>,
    );

    await waitFor(() => expect(getByText('HealthOS is locked')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByText('Sign out'));
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectSignOut?.(new Error('secure delete failed'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await findByText('secure delete failed')).toBeTruthy();
    expect(queryByText('protected content')).toBeNull();
  });

  it('clears stale lock setting if local auth is unavailable', async () => {
    mockGetAvailability.mockResolvedValueOnce({
      available: false,
      reason: 'not_available',
      methods: [],
      securityLevel: 'None',
    });

    const { getByText } = render(
      <AppLockProvider>
        <Text>protected content</Text>
      </AppLockProvider>,
    );

    await waitFor(() => expect(mockSetEnabled).toHaveBeenCalledWith(false));
    expect(getByText('protected content')).toBeTruthy();
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('locks again on foreground resume when app lock is enabled', async () => {
    const { getByText } = render(
      <AppLockProvider>
        <Text>protected content</Text>
      </AppLockProvider>,
    );

    await waitFor(() => expect(getByText('protected content')).toBeTruthy());
    mockAuthenticate.mockClear();

    await moveAppToBackgroundAndForeground();

    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalledTimes(1));
  });

  it('keeps content locked when foreground unlock is cancelled', async () => {
    const { getByText, queryByText } = render(
      <AppLockProvider>
        <Text>protected content</Text>
      </AppLockProvider>,
    );

    await waitFor(() => expect(getByText('protected content')).toBeTruthy());
    mockAuthenticate.mockResolvedValueOnce(false);

    await moveAppToBackgroundAndForeground();

    await waitFor(() => expect(getByText('HealthOS is locked')).toBeTruthy());
    expect(queryByText('protected content')).toBeNull();
  });

  it('does not lock out users on foreground resume if local auth became unavailable', async () => {
    const { getByText } = render(
      <AppLockProvider>
        <Text>protected content</Text>
      </AppLockProvider>,
    );

    await waitFor(() => expect(getByText('protected content')).toBeTruthy());
    jest.clearAllMocks();
    mockIsEnabled.mockResolvedValue(true);
    mockGetAvailability.mockResolvedValueOnce({
      available: false,
      reason: 'not_available',
      methods: [],
      securityLevel: 'None',
    });

    await moveAppToBackgroundAndForeground();

    await waitFor(() => expect(mockSetEnabled).toHaveBeenCalledWith(false));
    expect(getByText('protected content')).toBeTruthy();
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });
});
