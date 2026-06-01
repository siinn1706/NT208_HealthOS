/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PermissionsScreen } from '../components/auth/permissions-screen';

const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('PermissionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not pretend the notification setup screen grants OS permissions', () => {
    const { getByText, queryByText } = render(<PermissionsScreen kind="notifications" />);

    expect(queryByText('auth.allowNotifications')).toBeNull();
    expect(getByText('auth.permissionsNotificationsDescription')).toBeTruthy();

    fireEvent.press(getByText('auth.continueSetup'));
    expect(mockRouterReplace).toHaveBeenCalledWith('/home');
  });

  it('does not pretend camera or Health Connect permissions are granted from onboarding', () => {
    const camera = render(<PermissionsScreen kind="camera" />);
    expect(camera.queryByText('auth.allowCamera')).toBeNull();
    expect(camera.getByText('auth.permissionsCameraDescription')).toBeTruthy();
    camera.unmount();

    const health = render(<PermissionsScreen kind="health-data" />);
    expect(health.queryByText('Connect Health Connect')).toBeNull();
    expect(health.getByText('auth.permissionsHealthDescription')).toBeTruthy();
  });
});
