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

describe('PermissionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not pretend the notification setup screen grants OS permissions', () => {
    const { getByText, queryByText } = render(<PermissionsScreen kind="notifications" />);

    expect(queryByText('Allow notifications')).toBeNull();
    expect(getByText(/does not request OS push permissions/i)).toBeTruthy();

    fireEvent.press(getByText('Continue'));
    expect(mockRouterReplace).toHaveBeenCalledWith('/home');
  });

  it('does not pretend camera or Health Connect permissions are granted from onboarding', () => {
    const camera = render(<PermissionsScreen kind="camera" />);
    expect(camera.queryByText('Allow camera')).toBeNull();
    expect(camera.getByText(/does not grant camera access/i)).toBeTruthy();
    camera.unmount();

    const health = render(<PermissionsScreen kind="health-data" />);
    expect(health.queryByText('Connect Health Connect')).toBeNull();
    expect(health.getByText(/need an Android development build/i)).toBeTruthy();
  });
});
