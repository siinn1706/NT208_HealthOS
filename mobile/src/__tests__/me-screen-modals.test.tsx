/* eslint-env jest */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { AppearanceSheet, EmergencySheet, SignOutModal } from '../components/profile/me-screen-modals';
import { useApiQuery } from '../api/query';
import { preferenceService } from '../api/services/preference-service';

// ─── Shared mocks ─────────────────────────────────────────────────────────────

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../theme/theme-provider', () => ({
  useThemeContext: () => ({
    name: 'calm',
    tokens: require('../theme/palettes').palettes.calm,
    setTheme: jest.fn(),
  }),
}));

jest.mock('../theme/typography', () => ({
  typography: { h3: {}, bodyMed: {}, body: {}, caption: {}, micro: {} },
}));

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../api/queryKeys', () => ({
  queryKeys: {
    preferences: 'preferences',
    emergencyProfile: 'emergencyProfile',
    emergencyTokens: 'emergencyTokens',
    emergencyAccessLogs: 'emergencyAccessLogs',
  },
}));

jest.mock('../api/services/preference-service', () => ({
  preferenceService: { me: jest.fn(), update: jest.fn() },
}));

jest.mock('../api/services/emergency-service', () => ({
  emergencyService: {
    profile: jest.fn(),
    listTokens: jest.fn(),
    accessLogs: jest.fn(),
    updateProfile: jest.fn(),
    createToken: jest.fn(),
    revokeToken: jest.fn(),
    revokeAllTokens: jest.fn(),
  },
}));

jest.mock('../theme/theme-preference-mapping', () => ({
  preferenceToThemeSelection: () => 'calm',
  themeSelectionToPreference: (sel: string) => ({ appearance: sel }),
}));

jest.mock('../components/api/api-state', () => ({
  ApiState: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{title}</Text>;
  },
}));

jest.mock('../components/primitives/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('../components/primitives/button', () => ({
  Button: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable onPress={onPress} disabled={disabled} testID={`btn-${label}`}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));

jest.mock('../components/primitives/toggle', () => ({
  Toggle: ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => {
    const { Pressable } = require('react-native');
    return <Pressable testID={`toggle-${value}`} onPress={() => onChange(!value)} />;
  },
}));

jest.mock('../components/primitives/input/input', () => ({
  Input: ({ label, value, onChangeText }: { label: string; value: string; onChangeText: (t: string) => void }) => {
    const { TextInput } = require('react-native');
    return <TextInput testID={`input-${label}`} value={value} onChangeText={onChangeText} />;
  },
}));

jest.mock('../components/profile/emergency-card', () => ({
  EmergencyCard: () => {
    const { View } = require('react-native');
    return <View testID="emergency-card" />;
  },
}));

jest.mock('../icons', () => ({
  IconCheck: () => {
    const { View } = require('react-native');
    return <View testID="icon-check" />;
  },
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const idleQuery = { data: undefined, isLoading: false, error: null, reload: jest.fn() };

beforeEach(() => jest.clearAllMocks());

// ─── AppearanceSheet ──────────────────────────────────────────────────────────

describe('AppearanceSheet', () => {
  it('renders theme options when visible', () => {
    mockUseApiQuery.mockReturnValue(idleQuery as never);
    const { getByText } = render(<AppearanceSheet visible onClose={jest.fn()} />);
    expect(getByText('Calm Clinic')).toBeTruthy();
    expect(getByText('Night Sky')).toBeTruthy();
    expect(getByText('Warm Care')).toBeTruthy();
    expect(getByText('System')).toBeTruthy();
  });

  it('does not render theme list when hidden', () => {
    mockUseApiQuery.mockReturnValue(idleQuery as never);
    const { queryByText } = render(<AppearanceSheet visible={false} onClose={jest.fn()} />);
    expect(queryByText('Calm Clinic')).toBeNull();
  });

  it('calls onClose when overlay pressed', () => {
    mockUseApiQuery.mockReturnValue(idleQuery as never);
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(<AppearanceSheet visible onClose={onClose} />);
    const { Pressable } = require('react-native');
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls preferenceService.update when a theme option is pressed', async () => {
    mockUseApiQuery.mockReturnValue({ ...idleQuery, data: { appearance: 'calm' } } as never);
    (preferenceService.update as jest.Mock).mockResolvedValueOnce({});
    const onClose = jest.fn();
    const { getByText } = render(<AppearanceSheet visible onClose={onClose} />);
    await act(async () => {
      fireEvent.press(getByText('Night Sky'));
    });
    expect(preferenceService.update).toHaveBeenCalled();
  });

  it('shows error state when preferences query errors', () => {
    mockUseApiQuery.mockReturnValue({
      ...idleQuery,
      error: new Error('Pref fetch failed'),
    } as never);
    const { getByText } = render(<AppearanceSheet visible onClose={jest.fn()} />);
    expect(getByText('Appearance preference unavailable')).toBeTruthy();
  });
});

// ─── SignOutModal ─────────────────────────────────────────────────────────────

describe('SignOutModal', () => {
  const defaultProps = {
    visible: true,
    loading: false,
    error: null,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  it('renders sign out confirmation text', () => {
    const { getByText } = render(<SignOutModal {...defaultProps} />);
    expect(getByText('Sign out?')).toBeTruthy();
  });

  it('calls onConfirm when Sign out button pressed', () => {
    const onConfirm = jest.fn();
    const { getByText } = render(<SignOutModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.press(getByText('Sign out'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(<SignOutModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state label', () => {
    const { getByText } = render(<SignOutModal {...defaultProps} loading />);
    expect(getByText('Signing out…')).toBeTruthy();
  });

  it('shows error message when provided', () => {
    const { getByText } = render(<SignOutModal {...defaultProps} error="Session expired" />);
    expect(getByText('Session expired')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(<SignOutModal {...defaultProps} visible={false} />);
    expect(queryByText('Sign out?')).toBeNull();
  });
});

// ─── EmergencySheet (loading / error states) ─────────────────────────────────

describe('EmergencySheet', () => {
  it('shows loading state while profile is fetching', () => {
    mockUseApiQuery.mockReturnValue({ ...idleQuery, isLoading: true } as never);
    const { getAllByText } = render(<EmergencySheet visible onClose={jest.fn()} />);
    expect(getAllByText('Loading emergency profile').length).toBeGreaterThan(0);
  });

  it('shows error state when profile fetch fails', () => {
    mockUseApiQuery.mockImplementation((key: unknown) => {
      if (key === 'emergencyProfile') {
        return { ...idleQuery, error: new Error('Profile load failed') } as never;
      }
      return idleQuery as never;
    });
    const { getByText } = render(<EmergencySheet visible onClose={jest.fn()} />);
    expect(getByText('Emergency profile unavailable')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    mockUseApiQuery.mockReturnValue(idleQuery as never);
    const { queryByText } = render(<EmergencySheet visible={false} onClose={jest.fn()} />);
    expect(queryByText('Emergency Info')).toBeNull();
  });

  it('shows share tokens section header', () => {
    mockUseApiQuery.mockReturnValue(idleQuery as never);
    const { getByText } = render(<EmergencySheet visible onClose={jest.fn()} />);
    expect(getByText('Share tokens')).toBeTruthy();
  });
});
