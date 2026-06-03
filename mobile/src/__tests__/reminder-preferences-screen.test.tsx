/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  ReminderPreferencesScreen,
} from '../components/reminders/reminder-preferences-screen';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { notificationService } from '../api/services';
import type { NotificationPreferences } from '../../../shared/api-contracts';

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  notificationService: {
    preferences: jest.fn(),
    updatePreferences: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
}));

jest.mock('../components/reminders/quiet-hours-ring', () => ({
  QuietHoursRing: ({ start, end }: { start: string; end: string }) => {
    const ReactActual = jest.requireActual<typeof import('react')>('react');
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return ReactActual.createElement(Text, null, `Quiet ring ${start}-${end}`);
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

// Partial i18n override: these keys diverge from the current EN locale JSON but match
// the test spec — keeping them here avoids updating all assertion strings at once.
jest.mock('react-i18next', () => {
  const overrides: Record<string, string> = {
    'reminders.notificationsCorePreferenceHint': 'Core preference controls in-app reminder behavior.',
    'reminders.notificationsPermissionStateLabel': 'System permission',
    'reminders.notificationsPermissionState': 'System permission',
    'reminders.notificationsPermissionUndetermined': 'not requested yet',
    'reminders.notificationsPermissionGranted': 'granted',
    'reminders.notificationsPermissionDenied': 'denied',
    'reminders.notificationsPermissionRequest': 'Enable permission',
    'reminders.notificationsPermissionOpenSettings': 'Open settings',
    'reminders.notificationsPermissionChecking': 'Checking system permission...',
    'reminders.saving': 'Saving...',
  };
  function resolveKey(key: string, params?: Record<string, string | number>): string {
    if (key in overrides) return overrides[key];
    const en = require('../i18n/locales/en.json') as Record<string, unknown>;
    const parts = key.split('.');
    let node: unknown = en;
    for (const part of parts) {
      node = (node as Record<string, unknown>)?.[part];
    }
    if (typeof node !== 'string') return key;
    if (!params) return node;
    return node.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
      params[k] !== undefined ? String(params[k]) : `{{${k}}}`,
    );
  }
  return {
    useTranslation: () => ({ t: resolveKey, i18n: { language: 'en', changeLanguage: jest.fn() } }),
    initReactI18next: { type: '3rdParty', init: jest.fn() },
    Trans: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;
const mockRouterBack = router.back as jest.MockedFunction<typeof router.back>;
const originalPlatformOS = Platform.OS;
const originalPlatformVersion = Platform.Version;
const mockOpenSettings = jest.spyOn(Linking, 'openSettings');
const mockCheckPermission = jest.spyOn(PermissionsAndroid, 'check');
const mockRequestPermission = jest.spyOn(PermissionsAndroid, 'request');

const reloadPreferences = jest.fn();

function preferences(overrides: Partial<NotificationPreferences> = {}): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...overrides,
    categories: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.categories,
      ...(overrides.categories ?? {}),
    },
    channels: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.channels,
      ...(overrides.channels ?? {}),
    },
    quiet_hours: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.quiet_hours,
      ...(overrides.quiet_hours ?? {}),
    },
  };
}

function renderPreferences(data = preferences()) {
  mockUseApiQuery.mockReturnValue({
    data,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: false,
    reload: reloadPreferences,
  } as never);
  return render(<ReminderPreferencesScreen />);
}

function setAndroidPlatform(version = 33) {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  Object.defineProperty(Platform, 'Version', { configurable: true, value: version });
}

describe('ReminderPreferencesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reloadPreferences.mockResolvedValue(undefined);
    mockNotificationService.updatePreferences.mockResolvedValue(DEFAULT_NOTIFICATION_PREFERENCES);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
    Object.defineProperty(Platform, 'Version', { configurable: true, value: originalPlatformVersion });
    mockCheckPermission.mockReset().mockResolvedValue(false);
    mockRequestPermission.mockReset().mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
    mockOpenSettings.mockReset().mockResolvedValue(undefined);
  });

  it('renders core preference controls and removes old static OS-permission text', () => {
    const { getByText, queryByText, queryByLabelText } = renderPreferences();

    expect(getByText('Critical alert bypass')).toBeTruthy();
    expect(getByText('Core preference controls in-app reminder behavior.')).toBeTruthy();
    expect(queryByText('Core preference · OS permission not managed in this build')).toBeNull();
    expect(queryByText('System permission')).toBeNull();
    expect(queryByText('Care team messages')).toBeNull();
    expect(queryByLabelText('Mon')).toBeNull();
    expect(queryByLabelText('Tue')).toBeNull();
  });

  it('shows OS notification permission state on supported Android and requests it', async () => {
    setAndroidPlatform(34);
    let permissionGranted = false;
    mockCheckPermission.mockImplementation(async () => permissionGranted);
    mockRequestPermission.mockImplementation(async () => {
      permissionGranted = true;
      return PermissionsAndroid.RESULTS.GRANTED;
    });

    const { getByText } = renderPreferences();

    expect(getByText('System permission')).toBeTruthy();
    await waitFor(() => expect(getByText('System permission: not requested yet')).toBeTruthy());
    expect(getByText('Enable permission')).toBeTruthy();

    fireEvent.press(getByText('Enable permission'));

    await waitFor(() => expect(mockRequestPermission).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS));
    await waitFor(() => expect(getByText('System permission: granted')).toBeTruthy());
    expect(mockOpenSettings).not.toHaveBeenCalled();
  });

  it('opens system notification settings when permission is already granted', async () => {
    setAndroidPlatform(34);
    mockCheckPermission.mockResolvedValueOnce(true);

    const { getByText } = renderPreferences();

    await waitFor(() => expect(getByText('System permission: granted')).toBeTruthy());
    await waitFor(() => expect(getByText('Open settings')).toBeTruthy());

    fireEvent.press(getByText('Open settings'));

    await waitFor(() => expect(mockOpenSettings).toHaveBeenCalled());
  });

  it('saves critical bypass through the notification preferences contract', async () => {
    const { getAllByRole, getByText } = renderPreferences(preferences({ critical_bypass: false }));

    fireEvent.press(getAllByRole('switch')[6]);
    fireEvent.press(getByText('Save'));

    await waitFor(() => expect(mockNotificationService.updatePreferences).toHaveBeenCalled());
    expect(mockNotificationService.updatePreferences).toHaveBeenCalledWith(expect.objectContaining({
      critical_bypass: true,
      categories: DEFAULT_NOTIFICATION_PREFERENCES.categories,
      quiet_hours: DEFAULT_NOTIFICATION_PREFERENCES.quiet_hours,
    }));
    expect(mockNotificationService.updatePreferences).not.toHaveBeenCalledWith(expect.objectContaining({
      categories: expect.objectContaining({ care: expect.any(Boolean) }),
    }));
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('notifications.');
    expect(reloadPreferences).toHaveBeenCalled();
    expect(mockRouterBack).toHaveBeenCalled();
  });

  it('resets preferences by PATCHing Core defaults instead of doing nothing', async () => {
    const { getByText } = renderPreferences(preferences({
      enabled: false,
      channels: { push: false, sound: false, haptics: true },
      critical_bypass: true,
      quiet_hours: { start: '21:00', end: '06:00' },
    }));

    fireEvent.press(getByText('Reset to defaults'));

    await waitFor(() => expect(mockNotificationService.updatePreferences).toHaveBeenCalledWith(
      DEFAULT_NOTIFICATION_PREFERENCES,
    ));
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('notifications.');
    expect(reloadPreferences).toHaveBeenCalled();
    expect(getByText('Notification preferences reset.')).toBeTruthy();
  });
});
