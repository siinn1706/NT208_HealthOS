/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MeScreen from '../../app/(tabs)/me';

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
const mockI18n = { language: 'en' };

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'me.title': 'Me',
      'me.settings': 'Settings',
      'me.loadingProfile': 'Loading profile',
      'me.profileSyncIssue': 'Profile sync issue',
      'me.signOutError': 'Could not sign out',
      'me.versionLine': 'HealthOS mobile',
      'me.languageUnavailable': 'Language settings not yet available',
      'common.retry': 'Retry',
    }[key] ?? key),
    i18n: mockI18n,
  }),
}));

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      username: 'test',
      display_name: 'Test User',
      avatar_url: null,
      onboarding_status: 'completed',
      onboarding_completed_at: null,
    },
    booting: false,
    authenticated: true,
    error: null,
    signOut: jest.fn(),
    refreshUser: jest.fn(),
  }),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../components/profile/language-settings-sheet', () => ({
  LanguageSettingsSheet: ({ visible }: { visible: boolean }) => {
    const { Text } = jest.requireActual('react-native');
    return visible ? <Text>Language sheet open</Text> : null;
  },
}));

jest.mock('../components/profile/me-screen-modals', () => ({
  AppearanceSheet: () => null,
  EmergencySheet: () => null,
  SignOutModal: () => null,
}));

jest.mock('../components/profile/account-settings-sheet', () => ({
  SettingsSheet: () => null,
}));

describe('MeScreen language row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockI18n.language = 'en';
  });

  it('opens the language sheet instead of the old unavailable modal', () => {
    const { getByText, queryByText } = render(<MeScreen />);

    fireEvent.press(getByText('Language'));

    expect(getByText('Language sheet open')).toBeTruthy();
    expect(queryByText('Language settings not yet available')).toBeNull();
  });

  it('opens the authenticated health profile route instead of the auth setup flow', () => {
    const { getByText } = render(<MeScreen />);

    fireEvent.press(getByText('Health profile'));

    expect(mockRouterPush).toHaveBeenCalledWith('/profile/health');
    expect(mockRouterPush).not.toHaveBeenCalledWith('/auth/setup');
  });

  it('opens real notification preferences instead of onboarding permission copy', () => {
    const { getByText } = render(<MeScreen />);

    fireEvent.press(getByText('Notifications'));

    expect(mockRouterPush).toHaveBeenCalledWith('/reminders/preferences');
    expect(mockRouterPush).not.toHaveBeenCalledWith('/onboarding/permissions/notifications');
  });
});
