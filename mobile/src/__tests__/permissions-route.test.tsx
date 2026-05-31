/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import PermissionsRoute from '../../app/onboarding/permissions/[kind]';

const mockAuthFlowScreen = jest.fn(({ permissionKind }: { permissionKind?: string }) => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return ReactActual.createElement(Text, null, `permission:${permissionKind}`);
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../components/auth/auth-flow-screen', () => ({
  AuthFlowScreen: (props: { permissionKind?: string }) => mockAuthFlowScreen(props),
}));

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;

describe('PermissionsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes valid permission kinds through to the auth flow', () => {
    mockUseLocalSearchParams.mockReturnValue({ kind: 'camera' } as never);

    const { getByText } = render(<PermissionsRoute />);

    expect(getByText('permission:camera')).toBeTruthy();
    expect(mockAuthFlowScreen).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'permissions',
      permissionKind: 'camera',
    }));
  });

  it('falls back to notifications for malformed permission deep links', () => {
    mockUseLocalSearchParams.mockReturnValue({ kind: 'not-a-real-kind' } as never);

    const { getByText } = render(<PermissionsRoute />);

    expect(getByText('permission:notifications')).toBeTruthy();
    expect(mockAuthFlowScreen).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'permissions',
      permissionKind: 'notifications',
    }));
  });
});
