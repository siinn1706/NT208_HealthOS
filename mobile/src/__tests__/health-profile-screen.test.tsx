/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HealthProfileScreen } from '../components/profile/health-profile-screen';
import { invalidateApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

const mockUpdateProfile = jest.fn();
const mockRouterBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: mockRouterBack,
  },
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
      onboarding_completed_at: '2026-05-01T00:00:00Z',
      full_name: 'Test User',
      date_of_birth: '1995-04-03',
      gender: 'female',
      blood_type: 'O+',
      height_cm: 168.5,
      weight_kg: 62.5,
      phone: '+84 900 000 000',
      address: 'District 1, Ho Chi Minh City',
    },
    updateProfile: mockUpdateProfile,
  }),
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

describe('HealthProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateProfile.mockResolvedValue({ id: 'user-1' });
  });

  it('prefills the current Core profile and saves profile updates', async () => {
    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    expect(getByLabelText('Full name').props.value).toBe('Test User');
    expect(getByLabelText('Date of birth').props.value).toBe('1995-04-03');

    expect(getByLabelText('Height').props.value).toBe('168.5');
    expect(getByLabelText('Weight').props.value).toBe('62.5');

    fireEvent.changeText(getByLabelText('Height'), '171.5');
    fireEvent.changeText(getByLabelText('Weight'), '64.25');
    fireEvent.changeText(getByLabelText('Phone'), '+84 911 111 111');
    fireEvent.press(getByText('Save profile'));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({
      full_name: 'Test User',
      date_of_birth: '1995-04-03',
      gender: 'female',
      blood_type: 'O+',
      height_cm: 171.5,
      weight_kg: 64.25,
      phone: '+84 911 111 111',
      address: 'District 1, Ho Chi Minh City',
    }));

    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.profile);
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.dashboard);
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.healthGoal);
    expect(getByText('Health profile saved.')).toBeTruthy();
  });

  it('requires a non-empty full name before saving', () => {
    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText('Full name'), '   ');
    fireEvent.press(getByText('Save profile'));

    expect(getByText('Full name is required.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it.each([
    ['Full name', 'x'.repeat(256), 'Full name must be 255 characters or fewer.'],
    ['Blood type', 'x'.repeat(17), 'Blood type must be 16 characters or fewer.'],
    ['Phone', '1'.repeat(33), 'Phone must be 32 characters or fewer.'],
    ['Address', 'x'.repeat(513), 'Address must be 512 characters or fewer.'],
  ])('blocks %s values longer than Core allows', (fieldLabel, value, message) => {
    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText(fieldLabel), value);
    fireEvent.press(getByText('Save profile'));

    expect(getByText(message)).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('clears stale save success before showing validation errors', async () => {
    const { getByLabelText, getByText, queryByText } = render(<HealthProfileScreen />);

    fireEvent.press(getByText('Save profile'));
    await waitFor(() => expect(getByText('Health profile saved.')).toBeTruthy());

    fireEvent.changeText(getByLabelText('Height'), '999');
    fireEvent.press(getByText('Save profile'));

    expect(getByText('Height must be 51-299.')).toBeTruthy();
    expect(queryByText('Health profile saved.')).toBeNull();
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
  });

  it('blocks impossible calendar dates before calling Core', () => {
    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText('Date of birth'), '2000-04-31');
    fireEvent.press(getByText('Save profile'));

    expect(getByText('Date must be valid.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('blocks invalid height before calling Core', async () => {
    const { getByLabelText, getByText } = render(<HealthProfileScreen />);

    fireEvent.changeText(getByLabelText('Height'), '999');
    fireEvent.press(getByText('Save profile'));

    expect(getByText('Height must be 51-299.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});
